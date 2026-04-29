using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Entities;
using BookLibrary.Api.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/stats")]
[Authorize(Roles = "Admin")]
public class AdminStatsController : ControllerBase
{
    private readonly IBookRepository _books;
    private readonly IReviewRepository _reviews;

    public AdminStatsController(IBookRepository books, IReviewRepository reviews)
    {
        _books = books;
        _reviews = reviews;
    }

    [HttpGet]
    public async Task<ActionResult<AdminStatsDto>> Get(CancellationToken ct)
    {
        // DbContext is not thread-safe — these MUST be awaited sequentially,
        // not started in parallel and joined with Task.WhenAll.
        var totalBooks = await _books.CountAsync(ct);
        var publishedBooks = await _books.CountPublishedAsync(ct);
        var downloads = await _books.SumDownloadsAsync(ct);
        var views = await _books.SumViewsAsync(ct);
        var pending = await _reviews.CountByStatusAsync(ReviewStatus.Pending, ct);
        var approved = await _reviews.CountByStatusAsync(ReviewStatus.Approved, ct);

        return Ok(new AdminStatsDto(
            totalBooks,
            publishedBooks,
            pending,
            approved,
            downloads,
            views));
    }
}
