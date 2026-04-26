using AutoMapper;
using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Entities;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Infrastructure.Storage;
using BookLibrary.Api.Repositories;

namespace BookLibrary.Api.Services;

public interface IAuthorService
{
    Task<List<AuthorDto>> ListAsync(CancellationToken ct);
    Task<AuthorDto> GetAsync(Guid id, CancellationToken ct);
    Task<AuthorDto> CreateAsync(CreateAuthorRequest req, CancellationToken ct);
    Task<AuthorDto> UpdateAsync(Guid id, UpdateAuthorRequest req, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
    Task<AuthorDto> UploadPhotoAsync(Guid id, Stream content, string contentType, string ext, CancellationToken ct);
}

public class AuthorService : IAuthorService
{
    private readonly IAuthorRepository _repo;
    private readonly IMapper _mapper;
    private readonly ISupabaseStorageClient _storage;
    private readonly SupabaseOptions _opt;

    public AuthorService(IAuthorRepository repo, IMapper mapper, ISupabaseStorageClient storage, Microsoft.Extensions.Options.IOptions<SupabaseOptions> opt)
    {
        _repo = repo;
        _mapper = mapper;
        _storage = storage;
        _opt = opt.Value;
    }

    public async Task<List<AuthorDto>> ListAsync(CancellationToken ct) =>
        _mapper.Map<List<AuthorDto>>(await _repo.ListAsync(ct));

    public async Task<AuthorDto> GetAsync(Guid id, CancellationToken ct)
    {
        var a = await _repo.GetAsync(id, ct) ?? throw AppException.NotFound("Author");
        return _mapper.Map<AuthorDto>(a);
    }

    public async Task<AuthorDto> CreateAsync(CreateAuthorRequest req, CancellationToken ct)
    {
        var a = new Author { Name = req.Name.Trim(), Bio = req.Bio };
        _repo.Add(a);
        await _repo.SaveChangesAsync(ct);
        return _mapper.Map<AuthorDto>(a);
    }

    public async Task<AuthorDto> UpdateAsync(Guid id, UpdateAuthorRequest req, CancellationToken ct)
    {
        var a = await _repo.GetAsync(id, ct) ?? throw AppException.NotFound("Author");
        a.Name = req.Name.Trim();
        a.Bio = req.Bio;
        a.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(ct);
        return _mapper.Map<AuthorDto>(a);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var a = await _repo.GetAsync(id, ct) ?? throw AppException.NotFound("Author");
        if (await _repo.HasBooksAsync(id, ct))
            throw AppException.Conflict("This author has books — reassign or delete those first.");
        _repo.Remove(a);
        await _repo.SaveChangesAsync(ct);
    }

    public async Task<AuthorDto> UploadPhotoAsync(Guid id, Stream content, string contentType, string ext, CancellationToken ct)
    {
        var a = await _repo.GetAsync(id, ct) ?? throw AppException.NotFound("Author");
        var key = $"authors/{id}.{ext.TrimStart('.')}";
        var url = await _storage.UploadAsync(_opt.CoversBucket, key, content, contentType, ct);
        a.PhotoUrl = url;
        a.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(ct);
        return _mapper.Map<AuthorDto>(a);
    }
}
