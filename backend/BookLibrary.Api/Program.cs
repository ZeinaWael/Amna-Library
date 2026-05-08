using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Threading.RateLimiting;
using BookLibrary.Api.Controllers;
using BookLibrary.Api.Data;
using BookLibrary.Api.Data.Seed;
using BookLibrary.Api.Filters;
using BookLibrary.Api.Infrastructure.Auth;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Infrastructure.Storage;
using BookLibrary.Api.Mapping;
using BookLibrary.Api.Repositories;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection("Supabase"));
builder.Services.Configure<BootstrapAdminOptions>(builder.Configuration.GetSection("BootstrapAdmin"));

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
       .UseSnakeCaseNamingConvention()
       // The repo never had a baseline migration (schema was provisioned
       // directly against Supabase), so EF sees the whole model as "pending".
       // We ship one hand-rolled migration at a time; suppress this single
       // warning so `dotnet ef database update` can run.
       .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddHttpClient<ISupabaseStorageClient, SupabaseStorageClient>();

builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<INameMasker, NameMasker>();

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAuthorRepository, AuthorRepository>();
builder.Services.AddScoped<IGenreRepository, GenreRepository>();
builder.Services.AddScoped<IBookRepository, BookRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAuthorService, AuthorService>();
builder.Services.AddScoped<IGenreService, GenreService>();
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddScoped<IReviewService, ReviewService>();

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiResponseWrappingFilter>();
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(jwt.Key) ? new string('0', 32) : jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        opt.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                // Reject tokens whose pwd_iat is older than the user's
                // current password_changed_at — instant logout for all
                // previously-issued tokens after a password change.
                var sub = ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                if (!Guid.TryParse(sub, out var userId) || userId == Guid.Empty)
                    return; // bootstrap admin or malformed sub — accept

                var pwdIatRaw = ctx.Principal?.FindFirst(JwtTokenService.PasswordIssuedAtClaim)?.Value;
                if (!long.TryParse(pwdIatRaw, out var pwdIatUnix))
                    return; // legacy token (issued before this feature) — accept

                var users = ctx.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
                var current = await users.GetPasswordChangedAtAsync(userId, ctx.HttpContext.RequestAborted);
                if (current is null)
                {
                    ctx.Fail("User not found.");
                    return;
                }

                var currentUnix = new DateTimeOffset(DateTime.SpecifyKind(current.Value, DateTimeKind.Utc))
                    .ToUnixTimeSeconds();
                if (pwdIatUnix < currentUnix)
                    ctx.Fail("Password changed; token rejected.");
            }
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(AccountController.ChangePasswordRateLimitPolicy, http =>
    {
        var key = http.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                  ?? http.Connection.RemoteIpAddress?.ToString()
                  ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0,
            AutoReplenishment = true,
        });
    });
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddPolicy("AllowFrontend", p =>
    p.WithOrigins(allowedOrigins)
     .AllowAnyHeader()
     .AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    try
    {
        await db.Database.OpenConnectionAsync();
        await db.Database.CloseConnectionAsync();
        await SeedData.EnsureSeededAsync(db, hasher, CancellationToken.None);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Skipping dev seed (database unreachable or migrations not applied).");
    }
}

app.Run();
