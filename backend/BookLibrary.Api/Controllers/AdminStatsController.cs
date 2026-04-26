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
        var totalBooks = _books.CountAsync(ct);
        var publishedBooks = _books.CountPublishedAsync(ct);
        var downloads = _books.SumDownloadsAsync(ct);
        var views = _books.SumViewsAsync(ct);
        var pending = _reviews.CountByStatusAsync(ReviewStatus.Pending, ct);
        var approved = _reviews.CountByStatusAsync(ReviewStatus.Approved, ct);

        await Task.WhenAll(totalBooks, publishedBooks, downloads, views, pending, approved);

        return Ok(new AdminStatsDto(
            totalBooks.Result,
            publishedBooks.Result,
            pending.Result,
            approved.Result,
            downloads.Result,
            views.Result));
    }
}
