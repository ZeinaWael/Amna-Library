using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/reviews")]
[Authorize(Roles = "Admin")]
public class AdminReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;
    public AdminReviewsController(IReviewService reviews) => _reviews = reviews;

    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminReviewDto>>> List([FromQuery] ReviewQuery query, CancellationToken ct)
        => Ok(await _reviews.ListAdminAsync(query, ct));

    [HttpPatch("{id:guid}/approve")]
    public async Task<ActionResult<AdminReviewDto>> Approve(Guid id, CancellationToken ct)
        => Ok(await _reviews.ApproveAsync(id, ct));

    [HttpPatch("{id:guid}/reject")]
    public async Task<ActionResult<AdminReviewDto>> Reject(Guid id, CancellationToken ct)
        => Ok(await _reviews.RejectAsync(id, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _reviews.DeleteAsync(id, ct);
        return NoContent();
    }
}
