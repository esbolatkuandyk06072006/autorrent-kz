# AutoRent KZ - smoke test against a running app on http://localhost:8080
# Usage: powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
$ErrorActionPreference = 'Stop'

$BaseUrl = 'http://localhost:8080'
$script:Passed = 0
$script:Failed = 0

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        $Body = $null,
        [string]$Token = ''
    )

    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }

    $params = @{
        Uri                = "$BaseUrl$Path"
        Method             = $Method
        Headers            = $headers
        UseBasicParsing    = $true
        ErrorAction        = 'Stop'
    }
    if ($null -ne $Body) {
        $params['ContentType'] = 'application/json'
        $params['Body'] = ($Body | ConvertTo-Json -Compress -Depth 10)
    }

    try {
        $response = Invoke-WebRequest @params
        return [pscustomobject]@{
            Status = [int]$response.StatusCode
            Body   = [string]$response.Content
        }
    }
    catch {
        $webResponse = $_.Exception.Response
        if ($null -eq $webResponse) { throw }
        $stream = $webResponse.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
        return [pscustomobject]@{
            Status = [int]$webResponse.StatusCode
            Body   = $text
        }
    }
}

function Convert-Body {
    param($Response)
    if ([string]::IsNullOrWhiteSpace($Response.Body)) { return $null }
    return $Response.Body | ConvertFrom-Json
}

function Assert-Status {
    param($Response, [int]$Expected, [string]$Label)
    if ($Response.Status -ne $Expected) {
        $script:Failed++
        throw "FAIL [$Label]: expected HTTP $Expected, got $($Response.Status). Body: $($Response.Body)"
    }
    $script:Passed++
    Write-Host "PASS [$Label] HTTP $Expected" -ForegroundColor Green
}

function Assert-True {
    param([bool]$Condition, [string]$Label)
    if (-not $Condition) {
        $script:Failed++
        throw "FAIL [$Label]"
    }
    $script:Passed++
    Write-Host "PASS [$Label]" -ForegroundColor Green
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Label)
    if ($Actual -ne $Expected) {
        $script:Failed++
        throw "FAIL [$Label]: expected '$Expected', got '$Actual'"
    }
    $script:Passed++
    Write-Host "PASS [$Label] = $Expected" -ForegroundColor Green
}

Write-Host "`nAutoRent KZ smoke test`n" -ForegroundColor Cyan

# 1. Public catalog
$response = Invoke-Api -Method GET -Path '/api/v1/cars?page=0&size=20'
Assert-Status $response 200 'public catalog'
$catalog = Convert-Body $response
Assert-True ($catalog.totalElements -ge 6) 'seed catalog has at least 6 cars'

# 2. Unauthorized access
$response = Invoke-Api -Method GET -Path '/api/v1/users/me'
Assert-Status $response 401 'profile without token is 401'

# 3. Login
$response = Invoke-Api -Method POST -Path '/api/v1/auth/login' -Body @{
    email = 'admin@autorrent.kz'
    password = 'Admin123!'
}
Assert-Status $response 200 'admin login'
$adminAuth = Convert-Body $response
Assert-Equal $adminAuth.user.role 'ADMIN' 'admin role'
$adminToken = $adminAuth.token

$response = Invoke-Api -Method POST -Path '/api/v1/auth/login' -Body @{
    email = 'user@autorrent.kz'
    password = 'User123!'
}
Assert-Status $response 200 'user login'
$userAuth = Convert-Body $response
Assert-Equal $userAuth.user.role 'USER' 'user role'
$userToken = $userAuth.token

# 4. Role restrictions
$response = Invoke-Api -Method GET -Path '/api/v1/reservations' -Token $userToken
Assert-Status $response 403 'USER cannot list all reservations'
$response = Invoke-Api -Method GET -Path '/api/v1/reviews' -Token $userToken
Assert-Status $response 403 'USER cannot list all reviews'

# 5. Admin creates a car
$plate = 'SMK' + (Get-Date -Format 'HHmmss')
$response = Invoke-Api -Method POST -Path '/api/v1/cars' -Token $adminToken -Body @{
    brand        = 'Toyota'
    model        = 'Camry'
    year         = 2023
    licensePlate = $plate
    category     = 'COMFORT'
    transmission = 'AUTOMATIC'
    fuelType     = 'PETROL'
    seats        = 5
    pricePerDay  = 25000.00
    city         = 'Almaty'
    description  = 'Smoke test car'
    imageUrl     = 'https://placehold.co/600x400?text=Smoke+Test'
}
Assert-Status $response 201 'ADMIN creates car'
$car = Convert-Body $response
$carId = $car.id
Assert-True ($carId -gt 0) 'created car has id'

$response = Invoke-Api -Method POST -Path '/api/v1/cars' -Token $userToken -Body @{
    brand        = 'Kia'
    model        = 'Rio'
    year         = 2021
    licensePlate = 'USR' + (Get-Date -Format 'HHmmss')
    category     = 'ECONOMY'
    transmission = 'MANUAL'
    fuelType     = 'PETROL'
    seats        = 5
    pricePerDay  = 15000.00
    city         = 'Shymkent'
}
Assert-Status $response 403 'USER cannot create car'

# 6. Reservation flow
$start = (Get-Date).Date.AddDays(10)
$end = $start.AddDays(4)
$startStr = $start.ToString('yyyy-MM-dd')
$endStr = $end.ToString('yyyy-MM-dd')

$response = Invoke-Api -Method POST -Path '/api/v1/reservations' -Token $userToken -Body @{
    carId     = [int]$carId
    startDate = $startStr
    endDate   = $endStr
}
Assert-Status $response 201 'USER creates reservation'
$reservation = Convert-Body $response
$reservationId = $reservation.id
Assert-Equal $reservation.status 'PENDING' 'new reservation status'
Assert-Equal $reservation.daysCount 4 'reservation days count'
Assert-Equal $reservation.totalPrice 100000.00 'reservation total price'

$response = Invoke-Api -Method POST -Path '/api/v1/reservations' -Token $userToken -Body @{
    carId     = [int]$carId
    startDate = $startStr
    endDate   = $endStr
}
Assert-Status $response 409 'overlapping reservation is 409'

$response = Invoke-Api -Method POST -Path '/api/v1/reservations' -Token $userToken -Body @{
    carId     = [int]$carId
    startDate = $endStr
    endDate   = $startStr
}
Assert-Status $response 400 'invalid date range is 400'

$response = Invoke-Api -Method GET -Path '/api/v1/reservations/my?page=0&size=20' -Token $userToken
Assert-Status $response 200 'USER lists own reservations'
$my = Convert-Body $response
Assert-True ((@($my.content | Where-Object { $_.id -eq $reservationId })).Count -eq 1) 'own reservation is in my list'

$response = Invoke-Api -Method PATCH -Path "/api/v1/reservations/$reservationId/cancel?reason=Smoke%20test" -Token $userToken
Assert-Status $response 200 'USER cancels reservation'
$cancelled = Convert-Body $response
Assert-Equal $cancelled.status 'CANCELLED' 'cancelled status'
Assert-Equal $cancelled.cancellationReason 'Smoke test' 'cancellation reason'

# 7. Admin car status transitions
$response = Invoke-Api -Method PATCH -Path "/api/v1/cars/$carId/status" -Token $adminToken -Body @{ status = 'MAINTENANCE' }
Assert-Status $response 200 'ADMIN sets car to MAINTENANCE'
$status = Convert-Body $response
Assert-Equal $status.status 'MAINTENANCE' 'car MAINTENANCE status'

$response = Invoke-Api -Method PATCH -Path "/api/v1/cars/$carId/status" -Token $adminToken -Body @{ status = 'ACTIVE' }
Assert-Status $response 200 'ADMIN returns car to ACTIVE'
$status = Convert-Body $response
Assert-Equal $status.status 'ACTIVE' 'car ACTIVE status'

# 8. Reviews: public list, uniqueness, update, moderation
$response = Invoke-Api -Method GET -Path '/api/v1/cars/1/reviews?page=0&size=10'
Assert-Status $response 200 'public car reviews'
$reviews = Convert-Body $response
Assert-True ($reviews.totalElements -ge 1) 'seed review exists'
$seedReview = $reviews.content[0]
$seedReviewId = $seedReview.id
$originalRating = $seedReview.rating
$originalComment = $seedReview.comment

$response = Invoke-Api -Method POST -Path '/api/v1/reviews' -Token $userToken -Body @{
    reservationId = 1
    rating        = 5
    comment       = 'Duplicate review should fail'
}
Assert-Status $response 409 'duplicate review is 409'

$response = Invoke-Api -Method PUT -Path "/api/v1/reviews/$seedReviewId" -Token $userToken -Body @{
    rating  = 4
    comment = 'Smoke test review update'
}
Assert-Status $response 200 'owner updates review'
$updatedReview = Convert-Body $response
Assert-Equal $updatedReview.rating 4 'updated review rating'

$response = Invoke-Api -Method PUT -Path "/api/v1/reviews/$seedReviewId" -Token $userToken -Body @{
    rating  = $originalRating
    comment = $originalComment
}
Assert-Status $response 200 'restore seed review'

$response = Invoke-Api -Method PATCH -Path "/api/v1/reviews/$seedReviewId/visibility" -Token $adminToken -Body @{ status = 'HIDDEN' }
Assert-Status $response 200 'ADMIN hides review'
$hidden = Convert-Body $response
Assert-Equal $hidden.status 'HIDDEN' 'hidden review status'

$response = Invoke-Api -Method GET -Path '/api/v1/cars/1/reviews?page=0&size=10'
Assert-Status $response 200 'public reviews after hiding'
$hiddenReviews = Convert-Body $response
Assert-Equal $hiddenReviews.totalElements 0 'hidden review excluded from public list'

$response = Invoke-Api -Method PATCH -Path "/api/v1/reviews/$seedReviewId/visibility" -Token $adminToken -Body @{ status = 'VISIBLE' }
Assert-Status $response 200 'ADMIN restores review visibility'
$visible = Convert-Body $response
Assert-Equal $visible.status 'VISIBLE' 'visible review status'

# 9. Soft delete car with reservation history
$response = Invoke-Api -Method DELETE -Path "/api/v1/cars/$carId" -Token $adminToken
Assert-Status $response 204 'ADMIN deletes car with history'
$response = Invoke-Api -Method GET -Path "/api/v1/cars/$carId"
Assert-Status $response 200 'archived car is still readable'
$archived = Convert-Body $response
Assert-Equal $archived.status 'ARCHIVED' 'car is soft-deleted'

# 10. Swagger / OpenAPI
$response = Invoke-Api -Method GET -Path '/v3/api-docs'
Assert-Status $response 200 'OpenAPI JSON'
$openApi = Convert-Body $response
Assert-True ($null -ne $openApi.paths.'/api/v1/cars') 'OpenAPI contains cars path'

$response = Invoke-Api -Method GET -Path '/swagger-ui.html'
Assert-Status $response 200 'Swagger UI'

Write-Host "`nSMOKE TEST PASSED: $script:Passed checks`n" -ForegroundColor Green
