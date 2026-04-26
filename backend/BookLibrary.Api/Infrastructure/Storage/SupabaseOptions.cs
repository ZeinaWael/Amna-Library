namespace BookLibrary.Api.Infrastructure.Storage;

public class SupabaseOptions
{
    public string Url { get; set; } = default!;
    public string ServiceRoleKey { get; set; } = default!;
    public string CoversBucket { get; set; } = "book-covers";
    public string FilesBucket { get; set; } = "book-files";
}
