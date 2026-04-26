namespace BookLibrary.Api.Contracts.Requests;

public record CreateAuthorRequest(string Name, string? Bio);
public record UpdateAuthorRequest(string Name, string? Bio);
public record CreateGenreRequest(string Name, string Slug, string? Icon, string? Color);
public record UpdateGenreRequest(string Name, string Slug, string? Icon, string? Color);
