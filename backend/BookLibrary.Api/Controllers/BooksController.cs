using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/books")]
public class BooksController : ControllerBase
{
    private readonly IBookService _books;
    private readonly IReviewService _reviews;

    public BooksController(IBookService books, IReviewService reviews)
    {
        _books = books;
        _reviews = reviews;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<BookSummaryDto>>> List([FromQuery] BookQuery query, CancellationToken ct)
        => Ok(await _books.ListPublishedAsync(query, ct));

    [HttpGet("featured")]
    public async Task<ActionResult<List<BookSummaryDto>>> Featured([FromQuery] int take = 6, CancellationToken ct = default)
        => Ok(await _books.FeaturedAsync(Math.Clamp(take, 1, 24), ct));

    [HttpGet("search")]
    public async Task<ActionResult<PagedResult<BookSummaryDto>>> Search([FromQuery] string q, [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
        => Ok(await _books.SearchAsync(new BookSearchQuery(q ?? string.Empty, page, pageSize), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BookDetailDto>> Get(Guid id, CancellationToken ct)
        => Ok(await _books.GetDetailAsync(id, ct));

    [HttpPost("{id:guid}/download")]
    public async Task<ActionResult<DownloadResponse>> Download(Guid id, CancellationToken ct)
        => Ok(await _books.RegisterDownloadAsync(id, ct));

    [HttpGet("{id:guid}/reviews")]
    public async Task<ActionResult<List<PublicReviewDto>>> Reviews(Guid id, CancellationToken ct)
        => Ok(await _reviews.ListApprovedForBookAsync(id, ct));

    [HttpPost("{id:guid}/reviews")]
    public async Task<ActionResult<PublicReviewDto>> SubmitReview(Guid id, [FromBody] CreateReviewRequest req, CancellationToken ct)
    {
        var result = await _reviews.SubmitAsync(id, req, ct);
        return StatusCode(201, result);
    }
}
