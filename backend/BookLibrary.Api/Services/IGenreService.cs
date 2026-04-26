using AutoMapper;
using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Entities;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Repositories;

namespace BookLibrary.Api.Services;

public interface IGenreService
{
    Task<List<GenreDto>> ListAsync(CancellationToken ct);
    Task<GenreDto> CreateAsync(CreateGenreRequest req, CancellationToken ct);
    Task<GenreDto> UpdateAsync(Guid id, UpdateGenreRequest req, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}

public class GenreService : IGenreService
{
    private readonly IGenreRepository _repo;
    private readonly IMapper _mapper;

    public GenreService(IGenreRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<GenreDto>> ListAsync(CancellationToken ct) =>
        _mapper.Map<List<GenreDto>>(await _repo.ListAsync(ct));

    public async Task<GenreDto> CreateAsync(CreateGenreRequest req, CancellationToken ct)
    {
        var g = new Genre
        {
            Name = req.Name.Trim(),
            Slug = req.Slug.Trim().ToLowerInvariant(),
            Icon = string.IsNullOrWhiteSpace(req.Icon) ? null : req.Icon.Trim(),
            Color = string.IsNullOrWhiteSpace(req.Color) ? null : req.Color.Trim(),
        };
        _repo.Add(g);
        await _repo.SaveChangesAsync(ct);
        return _mapper.Map<GenreDto>(g);
    }

    public async Task<GenreDto> UpdateAsync(Guid id, UpdateGenreRequest req, CancellationToken ct)
    {
        var g = await _repo.GetAsync(id, ct) ?? throw AppException.NotFound("Genre");
        g.Name = req.Name.Trim();
        g.Slug = req.Slug.Trim().ToLowerInvariant();
        g.Icon = string.IsNullOrWhiteSpace(req.Icon) ? null : req.Icon.Trim();
        g.Color = string.IsNullOrWhiteSpace(req.Color) ? null : req.Color.Trim();
        await _repo.SaveChangesAsync(ct);
        return _mapper.Map<GenreDto>(g);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var g = await _repo.GetAsync(id, ct) ?? throw AppException.NotFound("Genre");
        if (await _repo.HasBooksAsync(id, ct))
            throw AppException.Conflict("This genre has books — reassign or delete those first.");
        _repo.Remove(g);
        await _repo.SaveChangesAsync(ct);
    }
}
