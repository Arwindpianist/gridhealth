using Microsoft.Extensions.Logging;

namespace GridHealth.Agent.Services;

public class EnrollmentService : IEnrollmentService
{
    private readonly ILogger<EnrollmentService> _logger;

    public EnrollmentService(ILogger<EnrollmentService> logger)
    {
        _logger = logger;
    }

    public Task<bool> EnrollAsync(string token)
    {
        _logger.LogInformation("Enrollment service started with token: {Token}", token);
        return Task.FromResult(true);
    }
} 