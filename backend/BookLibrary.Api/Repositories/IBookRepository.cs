using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Data;
using BookLibrary.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookLibrary.Api.Repositories;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(Guid id, bool includeNav, CancellationToken ct);
    Task<(IReadOnlyList<Book> items, int total)> QueryPublishedAsync(BookQuery query, CancellationToken ct);
    Task<(IReadOnlyList<Book> items, int total)> SearchPublishedAsync(string q, int page, int pageSize, CancellationToken ct);
    Task<List<Book>> FeaturedAsync(int take, CancellationToken ct);
    Task<(IReadOnlyList<Book> items, int total)> ListAdminAsync(int page, int pageSize, CancellationToken ct);
    void Add(Book book);
    void Update(Book book);
    void Remove(Book book);
    Task IncrementViewAsync(Guid id, CancellationToken ct);
    Task IncrementDownloadAsync(Guid id, CancellationToken ct);
    Task RecalculateRatingAsync(Guid id, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
    Task<int> CountAsync(CancellationToken ct);
    Task<int> CountPublishedAsync(CancellationToken ct);
    Task<long> SumDownloadsAsync(CancellationToken ct);
    Task<long> SumViewsAsync(CancellationToken ct);
}

public class BookRepository : IBookRepository
{
    private readonly AppDbContext _db;
    public BookRepository(AppDbContext db) => _db = db;

    public Task<Book?> GetByIdAsync(Guid id, bool includeNav, CancellationToken ct)
    {
        var q = _db.Books.AsQueryable();
        if (includeNav) q = q.Include(b => b.Author).Include(b => b.Genre);
        return q.FirstOrDefaultAsync(b => b.Id == id, ct);
    }

    public async Task<(IReadOnlyList<Book> items, int total)> QueryPublishedAsync(BookQuery query, CancellationToken ct)
    {
        var q = _db.Books.AsNoTracking()
            .Include(b => b.Author).Include(b => b.Genre)
            .Where(b => b.IsPublished);

        if (!string.IsNullOrWhiteSpace(query.Genre))
            q = q.Where(b => b.Genre.Slug == query.Genre || b.Genre.Name == query.Genre);

        if (!string.IsNullOrWhiteSpace(query.Language))
            q = q.Where(b => b.Language == query.Language);

        if (query.Year.HasValue)
            q = q.Where(b => b.Year == query.Year);

        q = (query.Sort ?? "newest") switch
        {
            "top-rated" => q.OrderByDescending(b => b.AverageRating).ThenByDescending(b => b.ReviewCount),
            "most-downloaded" => q.OrderByDescending(b => b.DownloadCount),
            _ => q.OrderByDescending(b => b.CreatedAt),
        };

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var size = Math.Clamp(query.PageSize, 1, 100);
        var items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return (items, total);
    }

    public async Task<(IReadOnlyList<Book> items, int total)> SearchPublishedAsync(string q, int page, int pageSize, CancellationToken ct)
    {
        var term = (q ?? string.Empty).Trim();
        var like = $"%{term}%";
        Guid? asGuid = Guid.TryParse(term, out var g) ? g : null;

        var query = _db.Books.AsNoTracking()
            .Include(b => b.Author).Include(b => b.Genre)
            .Where(b => b.IsPublished &&
                (EF.Functions.ILike(b.Title, like) ||
                 EF.Functions.ILike(b.Description, like) ||
                 EF.Functions.ILike(b.Author.Name, like) ||
                 (asGuid.HasValue && b.Id == asGuid.Value)))
            .OrderByDescending(b => b.AverageRating)
            .ThenByDescending(b => b.CreatedAt);

        var total = await query.CountAsync(ct);
        var p = Math.Max(1, page);
        var s = Math.Clamp(pageSize, 1, 100);
        var items = await query.Skip((p - 1) * s).Take(s).ToListAsync(ct);
        return (items, total);
    }

    public Task<List<Book>> FeaturedAsync(int take, CancellationToken ct) =>
        _db.Books.AsNoTracking()
            .Include(b => b.Author).Include(b => b.Genre)
            .Where(b => b.IsPublished && b.IsFeatured)
            .OrderByDescending(b => b.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

    public async Task<(IReadOnlyList<Book> items, int total)> ListAdminAsync(int page, int pageSize, CancellationToken ct)
    {
        var q = _db.Books.AsNoTracking()
            .Include(b => b.Author).Include(b => b.Genre)
            .OrderByDescending(b => b.CreatedAt);
        var total = await q.CountAsync(ct);
        var p = Math.Max(1, page);
        var s = Math.Clamp(pageSize, 1, 100);
        var items = await q.Skip((p - 1) * s).Take(s).ToListAsync(ct);
        return (items, total);
    }

    public void Add(Book book) => _db.Books.Add(book);
    public void Update(Book book) => _db.Books.Update(book);
    public void Remove(Book book) => _db.Books.Remove(book);

    public Task IncrementViewAsync(Guid id, CancellationToken ct) =>
        _db.Books.Where(b => b.Id == id).ExecuteUpdateAsync(s => s.SetProperty(b => b.ViewCount, b => b.ViewCount + 1), ct);

    public Task IncrementDownloadAsync(Guid id, CancellationToken ct) =>
        _db.Books.Where(b => b.Id == id).ExecuteUpdateAsync(s => s.SetProperty(b => b.DownloadCount, b => b.DownloadCount + 1), ct);

    public async Task RecalculateRatingAsync(Guid id, CancellationToken ct)
    {
        var stats = await _db.Reviews
            .Where(r => r.BookId == id && r.Status == ReviewStatus.Approved)
            .GroupBy(r => 1)
            .Select(g => new { Avg = g.Average(r => (decimal?)r.Rating) ?? 0m, Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        var avg = stats?.Avg ?? 0m;
        var count = stats?.Count ?? 0;

        await _db.Books.Where(b => b.Id == id).ExecuteUpdateAsync(s =>
            s.SetProperty(b => b.AverageRating, _ => Math.Round(avg, 2))
             .SetProperty(b => b.ReviewCount, _ => count)
             .SetProperty(b => b.UpdatedAt, _ => DateTime.UtcNow), ct);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);

    public Task<int> CountAsync(CancellationToken ct) => _db.Books.CountAsync(ct);
    public Task<int> CountPublishedAsync(CancellationToken ct) => _db.Books.CountAsync(b => b.IsPublished, ct);
    public Task<long> SumDownloadsAsync(CancellationToken ct) => _db.Books.SumAsync(b => (long)b.DownloadCount, ct);
    public Task<long> SumViewsAsync(CancellationToken ct) => _db.Books.SumAsync(b => (long)b.ViewCount, ct);
}
