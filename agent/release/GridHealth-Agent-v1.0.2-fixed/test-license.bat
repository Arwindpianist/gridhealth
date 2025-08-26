@echo off
echo Testing GridHealth Agent License Validation...
echo.

echo Testing license key: ADMIN-UNLIMITED-749fdd88-cbcc-414b-b679-0b313af45c25
echo.

REM Test the license validation API
curl -X POST https://gridhealth.arwindpianist.store/api/licenses/validate -H "Content-Type: application/json" -d "{\"license_key\":\"ADMIN-UNLIMITED-749fdd88-cbcc-414b-b679-0b313af45c25\",\"action\":\"validate\",\"timestamp\":\"2024-01-01T00:00:00Z\"}"

echo.
echo.
echo If you see a JSON response with "isValid":true, the API is working correctly.
echo If you see an error, there may be a network or configuration issue.
echo.
pause 