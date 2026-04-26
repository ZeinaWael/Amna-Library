using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/authors")]
[Authorize(Roles = "Admin")]
public class AdminAuthorsController : ControllerBase
{
    private readonly IAuthorService _authors;
    public AdminAuthorsController(IAuthorService authors) => _authors = authors;

    [HttpGet]
    public async Task<ActionResult<List<AuthorDto>>> List(CancellationToken ct)
        => Ok(await _authors.ListAsync(ct));

    [HttpPost]
    public async Task<ActionResult<AuthorDto>> Create([FromBody] CreateAuthorRequest req, CancellationToken ct)
    {
        var dto = await _authors.CreateAsync(req, ct);
        return StatusCode(201, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AuthorDto>> Update(Guid id, [FromBody] UpdateAuthorRequest req, CancellationToken ct)
        => Ok(await _authors.UpdateAsync(id, req, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _authors.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/photo")]
    public async Task<ActionResult<AuthorDto>> UploadPhoto(Guid id, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw AppException.BadRequest("File is required.");
        var ext = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
        if (ext is not ("jpg" or "jpeg" or "png" or "webp"))
            throw AppException.BadRequest("Only jpg/jpeg/png/webp images are allowed.");
        await using var s = file.OpenReadStream();
        return Ok(await _authors.UploadPhotoAsync(id, s, file.ContentType ?? "image/jpeg", ext, ct));
    }
}
