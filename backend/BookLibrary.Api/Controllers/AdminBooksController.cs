using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/books")]
[Authorize(Roles = "Admin")]
public class AdminBooksController : ControllerBase
{
    private readonly IBookService _books;
    public AdminBooksController(IBookService books) => _books = books;

    [HttpGet]
    public async Task<ActionResult<PagedResult<BookSummaryDto>>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await _books.ListAdminAsync(page, pageSize, ct));

    [HttpPost]
    public async Task<ActionResult<BookDetailDto>> Create([FromBody] CreateBookRequest req, CancellationToken ct)
    {
        var dto = await _books.CreateAsync(req, ct);
        return StatusCode(201, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BookDetailDto>> Update(Guid id, [FromBody] UpdateBookRequest req, CancellationToken ct)
        => Ok(await _books.UpdateAsync(id, req, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _books.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/publish")]
    public async Task<ActionResult<BookDetailDto>> Publish(Guid id, [FromBody] PublishBookRequest req, CancellationToken ct)
        => Ok(await _books.SetPublishedAsync(id, req.IsPublished, ct));

    [HttpPost("{id:guid}/cover")]
    public async Task<ActionResult<BookDetailDto>> UploadCover(Guid id, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw AppException.BadRequest("File is required.");
        var ext = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
        if (ext is not ("jpg" or "jpeg" or "png" or "webp"))
            throw AppException.BadRequest("Only jpg/jpeg/png/webp covers are allowed.");
        await using var s = file.OpenReadStream();
        return Ok(await _books.UploadCoverAsync(id, s, file.ContentType ?? "image/jpeg", ext, ct));
    }

    [HttpPost("{id:guid}/file")]
    [RequestSizeLimit(100_000_000)]
    public async Task<ActionResult<BookDetailDto>> UploadFile(Guid id, IFormFile file, [FromForm] int? pageCount, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw AppException.BadRequest("File is required.");
        if (!string.Equals(Path.GetExtension(file.FileName), ".pdf", StringComparison.OrdinalIgnoreCase))
            throw AppException.BadRequest("Only PDF files are allowed.");
        await using var s = file.OpenReadStream();
        return Ok(await _books.UploadFileAsync(id, s, file.ContentType ?? "application/pdf", file.Length, pageCount, ct));
    }
}
