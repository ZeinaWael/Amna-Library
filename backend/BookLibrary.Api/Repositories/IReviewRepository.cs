using BookLibrary.Api.Data;
using BookLibrary.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookLibrary.Api.Repositories;

public interface IReviewRepository
{
    Task<List<Review>> ListApprovedForBookAsync(Guid bookId, CancellationToken ct);
    Task<List<Review>> LatestApprovedAsync(int take, CancellationToken ct);
    Task<Review?> GetAsync(Guid id, CancellationToken ct);
    void Add(Review review);
    void Update(Review review);
    void Remove(Review review);
    Task<bool> ExistsForBookAndEmailAsync(Guid bookId, string email, CancellationToken ct);
    Task<(IReadOnlyList<Review> items, int total)> ListAdminAsync(string? status, int page, int pageSize, CancellationToken ct);
    Task<int> CountByStatusAsync(string status, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
}

public class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _db;
    public ReviewRepository(AppDbContext db) => _db = db;

    public Task<List<Review>> ListApprovedForBookAsync(Guid bookId, CancellationToken ct) =>
        _db.Reviews.AsNoTracking()
            .Where(r => r.BookId == bookId && r.Status == ReviewStatus.Approved)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

    public Task<List<Review>> LatestApprovedAsync(int take, CancellationToken ct) =>
        _db.Reviews.AsNoTracking()
            .Include(r => r.Book)
            .Where(r => r.Status == ReviewStatus.Approved)
            .OrderByDescending(r => r.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

    public Task<Review?> GetAsync(Guid id, CancellationToken ct) =>
        _db.Reviews.Include(r => r.Book).FirstOrDefaultAsync(r => r.Id == id, ct);

    public void Add(Review review) => _db.Reviews.Add(review);
    public void Update(Review review) => _db.Reviews.Update(review);
    public void Remove(Review review) => _db.Reviews.Remove(review);

    public Task<bool> ExistsForBookAndEmailAsync(Guid bookId, string email, CancellationToken ct) =>
        _db.Reviews.AnyAsync(r => r.BookId == bookId && r.ReviewerEmail.ToLower() == email.ToLower(), ct);

    public async Task<(IReadOnlyList<Review> items, int total)> ListAdminAsync(string? status, int page, int pageSize, CancellationToken ct)
    {
        var q = _db.Reviews.AsNoTracking().Include(r => r.Book).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(r => r.Status == status);
        q = q.OrderByDescending(r => r.CreatedAt);
        var total = await q.CountAsync(ct);
        var p = Math.Max(1, page);
        var s = Math.Clamp(pageSize, 1, 100);
        var items = await q.Skip((p - 1) * s).Take(s).ToListAsync(ct);
        return (items, total);
    }

    public Task<int> CountByStatusAsync(string status, CancellationToken ct) =>
        _db.Reviews.CountAsync(r => r.Status == status, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);
}
