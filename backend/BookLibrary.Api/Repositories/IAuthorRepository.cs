using BookLibrary.Api.Data;
using BookLibrary.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookLibrary.Api.Repositories;

public interface IAuthorRepository
{
    Task<Author?> GetAsync(Guid id, CancellationToken ct);
    Task<List<Author>> ListAsync(CancellationToken ct);
    void Add(Author author);
    void Update(Author author);
    void Remove(Author author);
    Task<bool> HasBooksAsync(Guid id, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
}

public class AuthorRepository : IAuthorRepository
{
    private readonly AppDbContext _db;
    public AuthorRepository(AppDbContext db) => _db = db;

    public Task<Author?> GetAsync(Guid id, CancellationToken ct) =>
        _db.Authors.Include(a => a.Books).FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<List<Author>> ListAsync(CancellationToken ct) =>
        _db.Authors.Include(a => a.Books).AsNoTracking().OrderBy(a => a.Name).ToListAsync(ct);

    public void Add(Author author) => _db.Authors.Add(author);
    public void Update(Author author) => _db.Authors.Update(author);
    public void Remove(Author author) => _db.Authors.Remove(author);

    public Task<bool> HasBooksAsync(Guid id, CancellationToken ct) =>
        _db.Books.AnyAsync(b => b.AuthorId == id, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);
}
