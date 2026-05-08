using BookLibrary.Api.Data;
using BookLibrary.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookLibrary.Api.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<DateTime?> GetPasswordChangedAtAsync(Guid id, CancellationToken ct);
    Task UpdatePasswordAsync(Guid id, string newHash, DateTime passwordChangedAt, CancellationToken ct);
}

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct) =>
        _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task<DateTime?> GetPasswordChangedAtAsync(Guid id, CancellationToken ct)
    {
        var rows = await _db.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => (DateTime?)u.PasswordChangedAt)
            .ToListAsync(ct);
        return rows.FirstOrDefault();
    }

    public async Task UpdatePasswordAsync(Guid id, string newHash, DateTime passwordChangedAt, CancellationToken ct)
    {
        var rows = await _db.Users.Where(u => u.Id == id)
            .ExecuteUpdateAsync(s =>
                s.SetProperty(u => u.PasswordHash, _ => newHash)
                 .SetProperty(u => u.PasswordChangedAt, _ => passwordChangedAt), ct);
        if (rows == 0) throw new InvalidOperationException($"User {id} not found.");
    }
}
