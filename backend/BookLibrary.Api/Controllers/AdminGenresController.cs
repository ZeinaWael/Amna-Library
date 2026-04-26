using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/genres")]
[Authorize(Roles = "Admin")]
public class AdminGenresController : ControllerBase
{
    private readonly IGenreService _genres;
    public AdminGenresController(IGenreService genres) => _genres = genres;

    [HttpGet]
    public async Task<ActionResult<List<GenreDto>>> List(CancellationToken ct)
        => Ok(await _genres.ListAsync(ct));

    [HttpPost]
    public async Task<ActionResult<GenreDto>> Create([FromBody] CreateGenreRequest req, CancellationToken ct)
    {
        var dto = await _genres.CreateAsync(req, ct);
        return StatusCode(201, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GenreDto>> Update(Guid id, [FromBody] UpdateGenreRequest req, CancellationToken ct)
        => Ok(await _genres.UpdateAsync(id, req, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _genres.DeleteAsync(id, ct);
        return NoContent();
    }
}
