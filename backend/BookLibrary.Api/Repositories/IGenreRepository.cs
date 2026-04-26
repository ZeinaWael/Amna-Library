using BookLibrary.Api.Data;
using BookLibrary.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookLibrary.Api.Repositories;

public interface IGenreRepository
{
    Task<Genre?> GetAsync(Guid id, CancellationToken ct);
    Task<List<Genre>> ListAsync(CancellationToken ct);
    void Add(Genre genre);
    void Update(Genre genre);
    void Remove(Genre genre);
    Task<bool> HasBooksAsync(Guid id, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
}

public class GenreRepository : IGenreRepository
{
    private readonly AppDbContext _db;
    public GenreRepository(AppDbContext db) => _db = db;

    public Task<Genre?> GetAsync(Guid id, CancellationToken ct) =>
        _db.Genres.Include(g => g.Books).FirstOrDefaultAsync(g => g.Id == id, ct);

    public Task<List<Genre>> ListAsync(CancellationToken ct) =>
        _db.Genres.Include(g => g.Books).AsNoTracking().OrderBy(g => g.Name).ToListAsync(ct);

    public void Add(Genre genre) => _db.Genres.Add(genre);
    public void Update(Genre genre) => _db.Genres.Update(genre);
    public void Remove(Genre genre) => _db.Genres.Remove(genre);

    public Task<bool> HasBooksAsync(Guid id, CancellationToken ct) =>
        _db.Books.AnyAsync(b => b.GenreId == id, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);
}
