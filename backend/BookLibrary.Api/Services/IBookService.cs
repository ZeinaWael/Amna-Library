using AutoMapper;
using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Data;
using BookLibrary.Api.Entities;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Infrastructure.Storage;
using BookLibrary.Api.Repositories;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;

namespace BookLibrary.Api.Services;

public interface IBookService
{
    Task<PagedResult<BookSummaryDto>> ListPublishedAsync(BookQuery query, CancellationToken ct);
    Task<List<BookSummaryDto>> ListPublishedByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct);
    Task<List<BookSummaryDto>> FeaturedAsync(int take, CancellationToken ct);
    Task<PagedResult<BookSummaryDto>> SearchAsync(BookSearchQuery q, CancellationToken ct);
    Task<BookDetailDto> GetDetailAsync(Guid id, CancellationToken ct);
    Task<DownloadResponse> RegisterDownloadAsync(Guid id, CancellationToken ct);

    Task<PagedResult<BookSummaryDto>> ListAdminAsync(int page, int pageSize, CancellationToken ct);
    Task<BookDetailDto> CreateAsync(CreateBookRequest req, CancellationToken ct);
    Task<BookDetailDto> UpdateAsync(Guid id, UpdateBookRequest req, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
    Task<BookDetailDto> SetPublishedAsync(Guid id, bool published, CancellationToken ct);
    Task<BookDetailDto> UploadCoverAsync(Guid id, Stream content, string contentType, string ext, CancellationToken ct);
    Task<BookDetailDto> UploadFileAsync(Guid id, Stream content, string contentType, long size, int? pageCount, CancellationToken ct);
    Task RecalculateRatingAsync(Guid bookId, CancellationToken ct);
}

public class BookService : IBookService
{
    private readonly IBookRepository _repo;
    private readonly IMapper _mapper;
    private readonly ISupabaseStorageClient _storage;
    private readonly SupabaseOptions _opt;
    private readonly AppDbContext _db;

    public BookService(IBookRepository repo, IMapper mapper, ISupabaseStorageClient storage, IOptions<SupabaseOptions> opt, AppDbContext db)
    {
        _repo = repo;
        _mapper = mapper;
        _storage = storage;
        _opt = opt.Value;
        _db = db;
    }

    public async Task<PagedResult<BookSummaryDto>> ListPublishedAsync(BookQuery query, CancellationToken ct)
    {
        var (items, total) = await _repo.QueryPublishedAsync(query, ct);
        return new PagedResult<BookSummaryDto>(_mapper.Map<List<BookSummaryDto>>(items), Math.Max(1, query.Page), Math.Clamp(query.PageSize, 1, 100), total);
    }

    public async Task<List<BookSummaryDto>> FeaturedAsync(int take, CancellationToken ct) =>
        _mapper.Map<List<BookSummaryDto>>(await _repo.FeaturedAsync(take, ct));

    public async Task<List<BookSummaryDto>> ListPublishedByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct)
    {
        if (ids.Count == 0) return new List<BookSummaryDto>();
        var books = await _repo.GetPublishedByIdsAsync(ids, ct);
        var byId = books.ToDictionary(b => b.Id);
        var ordered = new List<Book>(ids.Count);
        foreach (var id in ids)
        {
            if (byId.TryGetValue(id, out var b)) ordered.Add(b);
        }
        return _mapper.Map<List<BookSummaryDto>>(ordered);
    }

    public async Task<PagedResult<BookSummaryDto>> SearchAsync(BookSearchQuery q, CancellationToken ct)
    {
        var (items, total) = await _repo.SearchPublishedAsync(q.Q, q.Page, q.PageSize, ct);
        return new PagedResult<BookSummaryDto>(_mapper.Map<List<BookSummaryDto>>(items), Math.Max(1, q.Page), Math.Clamp(q.PageSize, 1, 100), total);
    }

    public async Task<BookDetailDto> GetDetailAsync(Guid id, CancellationToken ct)
    {
        var b = await _repo.GetByIdAsync(id, true, ct) ?? throw AppException.NotFound("Book");
        await _repo.IncrementViewAsync(id, ct);
        return _mapper.Map<BookDetailDto>(b);
    }

    public async Task<DownloadResponse> RegisterDownloadAsync(Guid id, CancellationToken ct)
    {
        var b = await _repo.GetByIdAsync(id, false, ct) ?? throw AppException.NotFound("Book");
        if (!b.IsPublished || string.IsNullOrWhiteSpace(b.FileUrl))
            throw AppException.NotFound("Book file");
        await _repo.IncrementDownloadAsync(id, ct);
        return new DownloadResponse(b.FileUrl);
    }

    public async Task<PagedResult<BookSummaryDto>> ListAdminAsync(int page, int pageSize, CancellationToken ct)
    {
        var (items, total) = await _repo.ListAdminAsync(page, pageSize, ct);
        return new PagedResult<BookSummaryDto>(_mapper.Map<List<BookSummaryDto>>(items), Math.Max(1, page), Math.Clamp(pageSize, 1, 100), total);
    }

    public async Task<BookDetailDto> CreateAsync(CreateBookRequest req, CancellationToken ct)
    {
        var b = new Book
        {
            Title = req.Title.Trim(),
            Description = req.Description,
            Language = req.Language,
            Year = req.Year,
            Isbn = req.Isbn,
            AuthorId = req.AuthorId,
            GenreId = req.GenreId,
            IsFeatured = req.IsFeatured,
            IsPublished = false,
        };
        _repo.Add(b);
        await _repo.SaveChangesAsync(ct);
        var fresh = await _repo.GetByIdAsync(b.Id, true, ct)!;
        return _mapper.Map<BookDetailDto>(fresh);
    }

    public async Task<BookDetailDto> UpdateAsync(Guid id, UpdateBookRequest req, CancellationToken ct)
    {
        var b = await _repo.GetByIdAsync(id, false, ct) ?? throw AppException.NotFound("Book");
        b.Title = req.Title.Trim();
        b.Description = req.Description;
        b.Language = req.Language;
        b.Year = req.Year;
        b.Isbn = req.Isbn;
        b.AuthorId = req.AuthorId;
        b.GenreId = req.GenreId;
        b.IsFeatured = req.IsFeatured;
        b.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(ct);
        var fresh = await _repo.GetByIdAsync(id, true, ct)!;
        return _mapper.Map<BookDetailDto>(fresh);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var b = await _repo.GetByIdAsync(id, false, ct) ?? throw AppException.NotFound("Book");

        if (!string.IsNullOrWhiteSpace(b.CoverUrl))
        {
            var k = _storage.ExtractKeyFromPublicUrl(b.CoverUrl);
            if (k.HasValue) await _storage.DeleteAsync(k.Value.bucket, k.Value.key, ct);
        }
        if (!string.IsNullOrWhiteSpace(b.FileUrl))
        {
            var k = _storage.ExtractKeyFromPublicUrl(b.FileUrl);
            if (k.HasValue) await _storage.DeleteAsync(k.Value.bucket, k.Value.key, ct);
        }

        _repo.Remove(b);
        await _repo.SaveChangesAsync(ct);
    }

    public async Task<BookDetailDto> SetPublishedAsync(Guid id, bool published, CancellationToken ct)
    {
        var b = await _repo.GetByIdAsync(id, false, ct) ?? throw AppException.NotFound("Book");
        b.IsPublished = published;
        b.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(ct);
        var fresh = await _repo.GetByIdAsync(id, true, ct)!;
        return _mapper.Map<BookDetailDto>(fresh);
    }

    public async Task<BookDetailDto> UploadCoverAsync(Guid id, Stream content, string contentType, string ext, CancellationToken ct)
    {
        var b = await _repo.GetByIdAsync(id, false, ct) ?? throw AppException.NotFound("Book");
        var key = $"{id}.{ext.TrimStart('.')}";
        var url = await _storage.UploadAsync(_opt.CoversBucket, key, content, contentType, ct);
        b.CoverUrl = url;
        b.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(ct);
        var fresh = await _repo.GetByIdAsync(id, true, ct)!;
        return _mapper.Map<BookDetailDto>(fresh);
    }

    public async Task<BookDetailDto> UploadFileAsync(Guid id, Stream content, string contentType, long size, int? pageCount, CancellationToken ct)
    {
        var b = await _repo.GetByIdAsync(id, false, ct) ?? throw AppException.NotFound("Book");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        var key = $"{id}.pdf";
        var url = await _storage.UploadAsync(_opt.FilesBucket, key, content, contentType, ct);
        b.FileUrl = url;
        b.FileSizeBytes = size;
        b.PageCount = pageCount;
        b.IsPublished = true;
        b.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var fresh = await _repo.GetByIdAsync(id, true, ct)!;
        return _mapper.Map<BookDetailDto>(fresh);
    }

    public async Task RecalculateRatingAsync(Guid bookId, CancellationToken ct)
    {
        await using IDbContextTransaction tx = await _db.Database.BeginTransactionAsync(ct);
        await _repo.RecalculateRatingAsync(bookId, ct);
        await tx.CommitAsync(ct);
    }
}
