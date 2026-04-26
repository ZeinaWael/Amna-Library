using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
        => Ok(await _auth.LoginAsync(req, ct));
}
