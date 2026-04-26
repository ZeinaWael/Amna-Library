using AutoMapper;
using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Entities;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Repositories;

namespace BookLibrary.Api.Services;

public interface IReviewService
{
    Task<List<PublicReviewDto>> ListApprovedForBookAsync(Guid bookId, CancellationToken ct);
    Task<List<LatestReviewDto>> LatestApprovedAsync(int take, CancellationToken ct);
    Task<PublicReviewDto> SubmitAsync(Guid bookId, CreateReviewRequest req, CancellationToken ct);
    Task<PagedResult<AdminReviewDto>> ListAdminAsync(ReviewQuery q, CancellationToken ct);
    Task<AdminReviewDto> ApproveAsync(Guid id, CancellationToken ct);
    Task<AdminReviewDto> RejectAsync(Guid id, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviews;
    private readonly IBookRepository _books;
    private readonly IBookService _bookService;
    private readonly IMapper _mapper;
    private readonly INameMasker _masker;

    public ReviewService(IReviewRepository reviews, IBookRepository books, IBookService bookService, IMapper mapper, INameMasker masker)
    {
        _reviews = reviews;
        _books = books;
        _bookService = bookService;
        _mapper = mapper;
        _masker = masker;
    }

    public async Task<List<PublicReviewDto>> ListApprovedForBookAsync(Guid bookId, CancellationToken ct)
    {
        var list = await _reviews.ListApprovedForBookAsync(bookId, ct);
        return list.Select(r => new PublicReviewDto(r.Id, _masker.Mask(r.ReviewerName), r.Rating, r.Content, r.CreatedAt)).ToList();
    }

    public async Task<List<LatestReviewDto>> LatestApprovedAsync(int take, CancellationToken ct)
    {
        var list = await _reviews.LatestApprovedAsync(take, ct);
        return list.Select(r => new LatestReviewDto(
            r.BookId, r.Book.Title, r.Book.CoverUrl, _masker.Mask(r.ReviewerName), r.Rating, r.Content, r.CreatedAt
        )).ToList();
    }

    public async Task<PublicReviewDto> SubmitAsync(Guid bookId, CreateReviewRequest req, CancellationToken ct)
    {
        var book = await _books.GetByIdAsync(bookId, false, ct) ?? throw AppException.NotFound("Book");
        if (!book.IsPublished) throw AppException.NotFound("Book");

        var email = req.ReviewerEmail.Trim();
        if (await _reviews.ExistsForBookAndEmailAsync(bookId, email, ct))
            throw AppException.Conflict("You've already submitted a review for this book.");

        if (req.Rating < 1 || req.Rating > 5)
            throw AppException.BadRequest("Rating must be between 1 and 5.");

        var r = new Review
        {
            BookId = bookId,
            ReviewerName = req.ReviewerName.Trim(),
            ReviewerEmail = email,
            Rating = req.Rating,
            Content = req.Content.Trim(),
            Status = ReviewStatus.Pending,
        };
        _reviews.Add(r);
        await _reviews.SaveChangesAsync(ct);

        return new PublicReviewDto(r.Id, _masker.Mask(r.ReviewerName), r.Rating, r.Content, r.CreatedAt);
    }

    public async Task<PagedResult<AdminReviewDto>> ListAdminAsync(ReviewQuery q, CancellationToken ct)
    {
        var (items, total) = await _reviews.ListAdminAsync(q.Status, q.Page, q.PageSize, ct);
        return new PagedResult<AdminReviewDto>(_mapper.Map<List<AdminReviewDto>>(items), Math.Max(1, q.Page), Math.Clamp(q.PageSize, 1, 100), total);
    }

    public async Task<AdminReviewDto> ApproveAsync(Guid id, CancellationToken ct)
    {
        var r = await _reviews.GetAsync(id, ct) ?? throw AppException.NotFound("Review");
        var prev = r.Status;
        r.Status = ReviewStatus.Approved;
        r.UpdatedAt = DateTime.UtcNow;
        await _reviews.SaveChangesAsync(ct);
        if (prev != ReviewStatus.Approved)
            await _bookService.RecalculateRatingAsync(r.BookId, ct);
        return _mapper.Map<AdminReviewDto>(r);
    }

    public async Task<AdminReviewDto> RejectAsync(Guid id, CancellationToken ct)
    {
        var r = await _reviews.GetAsync(id, ct) ?? throw AppException.NotFound("Review");
        var prev = r.Status;
        r.Status = ReviewStatus.Rejected;
        r.UpdatedAt = DateTime.UtcNow;
        await _reviews.SaveChangesAsync(ct);
        if (prev == ReviewStatus.Approved)
            await _bookService.RecalculateRatingAsync(r.BookId, ct);
        return _mapper.Map<AdminReviewDto>(r);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var r = await _reviews.GetAsync(id, ct) ?? throw AppException.NotFound("Review");
        var prev = r.Status;
        var bookId = r.BookId;
        _reviews.Remove(r);
        await _reviews.SaveChangesAsync(ct);
        if (prev == ReviewStatus.Approved)
            await _bookService.RecalculateRatingAsync(bookId, ct);
    }
}
