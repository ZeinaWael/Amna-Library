namespace BookLibrary.Api.Contracts.Responses;

public record AuthorDto(Guid Id, string Name, string? Bio, string? PhotoUrl, int BookCount);
public record GenreDto(Guid Id, string Name, string Slug, string? Icon, string? Color, int BookCount);
