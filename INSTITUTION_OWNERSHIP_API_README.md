# Institution Ownership API - Standalone File

This standalone file provides a complete API endpoint for getting institution ownership data. You can use this file directly in your backend or integrate it into your existing FastAPI application.

## Features

- ✅ Get all institutions holding a ticker from the past 5 months
- ✅ Calculate ownership percentage for 13F-HR forms
- ✅ Use stored ownership for other form types (13G, 13D, etc.)
- ✅ Returns top 100 unique institutions by date (latest first)
- ✅ Simplified response with only: name, ownership, date, form_type

## Installation

1. Install required dependencies:

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic
```

2. Configure your database connection:

Open `institution_ownership_api.py` and update the `DATABASE_URL` at the top:

```python
DATABASE_URL = "postgresql://user:password@localhost:5432/sec_database"
```

## Usage

### Option 1: Run as Standalone Server

Run the file directly:

```bash
python institution_ownership_api.py
```

The server will start on `http://localhost:8000`

### Option 2: Import into Existing FastAPI App

Import the router and include it in your existing FastAPI application:

```python
from institution_ownership_api import router, get_db

app = FastAPI()
app.include_router(router)

# Make sure to set up database dependency
app.dependency_overrides[get_db] = get_db
```

### Option 3: Use Service Function Directly

Import and use the service function directly in your code:

```python
from institution_ownership_api import get_institution_ownership_by_ticker, get_db
from datetime import date

# Get database session
db = next(get_db())

# Call the service function
holders = await get_institution_ownership_by_ticker(
    db=db,
    ticker="AAPL",
    current_date=date(2025, 1, 15)  # Optional, defaults to today
)

# Process the results
for holder in holders:
    print(f"{holder['name']}: {holder['ownership']}% on {holder['date']}")
```

## API Endpoint

### GET `/companies/ticker/{ticker}/institution-ownership`

Get all institutions holding a ticker from past 5 months.

**Parameters:**
- `ticker` (path): Stock ticker symbol (e.g., "AAPL", "TSLA")
- `current_date` (query, optional): Current date in YYYY-MM-DD format. Defaults to today.

**Response:**
```json
[
  {
    "name": "VANGUARD GROUP INC",
    "ownership": 9.4707,
    "date": "2025-09-30",
    "form_type": "13F-HR"
  },
  {
    "name": "BlackRock Inc.",
    "ownership": 5.23,
    "date": "2025-10-17",
    "form_type": "SCHEDULE 13G/A"
  }
]
```

**Example Requests:**

```bash
# Using default date (today)
curl http://localhost:8000/companies/ticker/AAPL/institution-ownership

# With specific date
curl "http://localhost:8000/companies/ticker/AAPL/institution-ownership?current_date=2025-01-15"
```

## Response Fields

- **name**: Institution name
- **ownership**: Ownership percentage
  - For 13F-HR forms: Calculated from shares and weighted_shares_outstanding
  - For other forms: Uses ownership_percent stored in database
  - `null` if not available
- **date**: Filing date (period_of_report or filing_date) in YYYY-MM-DD format
- **form_type**: Form type (e.g., "13F-HR", "13F-HR/A", "SCHEDULE 13G", "SCHEDULE 13D")

## Database Schema Requirements

The API expects the following tables:

- `companies`: Company information with ticker
- `filers`: Institution/filer information
- `filings`: SEC filing records
- `positions`: Position/holding records
- `ticker_details`: Ticker details including share_outstanding

Make sure your database has these tables with the expected schema.

## Notes

- Returns top 100 unique institutions (by filer_id)
- Only keeps the latest filing per institution
- Ownership calculation:
  - 13F-HR forms: Calculated dynamically
  - Other forms: Uses stored ownership_percent value
- Date range: Past 5 months from current_date (or today)

## Error Handling

The API will return appropriate HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid date format or bad request
- `404 Not Found`: No data found for ticker
- `500 Internal Server Error`: Server error

## Support

For questions or issues, please contact the development team.

