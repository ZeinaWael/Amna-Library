using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
public class CatalogController : ControllerBase
{
    private readonly IGenreService _genres;
    private readonly IAuthorService _authors;
    private readonly IReviewService _reviews;

    public CatalogController(IGenreService genres, IAuthorService authors, IReviewService reviews)
    {
        _genres = genres;
        _authors = authors;
        _reviews = reviews;
    }

    [HttpGet("api/genres")]
    public async Task<ActionResult<List<GenreDto>>> Genres(CancellationToken ct)
        => Ok(await _genres.ListAsync(ct));

    [HttpGet("api/authors")]
    public async Task<ActionResult<List<AuthorDto>>> Authors(CancellationToken ct)
        => Ok(await _authors.ListAsync(ct));

    [HttpGet("api/authors/{id:guid}")]
    public async Task<ActionResult<AuthorDto>> Author(Guid id, CancellationToken ct)
        => Ok(await _authors.GetAsync(id, ct));

    [HttpGet("api/reviews/latest")]
    public async Task<ActionResult<List<LatestReviewDto>>> LatestReviews([FromQuery] int take = 6, CancellationToken ct = default)
        => Ok(await _reviews.LatestApprovedAsync(Math.Clamp(take, 1, 24), ct));
}
