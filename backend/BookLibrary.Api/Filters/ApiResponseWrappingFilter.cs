using BookLibrary.Api.Contracts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BookLibrary.Api.Filters;

public class ApiResponseWrappingFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.ActionDescriptor.EndpointMetadata.OfType<SkipResponseWrappingAttribute>().Any())
        {
            await next();
            return;
        }

        var executed = await next();
        if (executed.Result is ObjectResult obj)
        {
            if (obj.Value is ApiResponse || IsGenericApiResponse(obj.Value)) return;
            var status = obj.StatusCode ?? 200;
            if (status >= 400) return;
            executed.Result = new ObjectResult(ApiResponse.Ok(obj.Value)) { StatusCode = status };
        }
        else if (executed.Result is EmptyResult)
        {
            executed.Result = new ObjectResult(ApiResponse.Ok()) { StatusCode = 200 };
        }
    }

    private static bool IsGenericApiResponse(object? value)
    {
        if (value is null) return false;
        var t = value.GetType();
        return t.IsGenericType && t.GetGenericTypeDefinition() == typeof(ApiResponse<>);
    }
}
