"""
Insider Transactions Service
Service layer for insider transactions business logic (MongoDB)
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.insider_transactions import InsiderTransactionDocument


class InsiderTransactionsService:
    """Service for insider transactions operations.

    Stores each transaction as its own document in `InsiderTransactionDocument`.
    """

    async def save_transactions(
        self, symbol: str, transactions: List[Dict[str, Any]]
    ) -> int:
        """
        Save insider transactions to database.
        Each transaction is saved as a separate document.
        Duplicates are avoided by checking (symbol, name, transactionDate, change).

        Args:
            symbol: Company symbol
            transactions: List of transaction dictionaries from Finnhub API

        Returns:
            Number of transactions saved/updated
        """
        saved_count = 0
        symbol_upper = symbol.upper().strip()

        for transaction in transactions:
            try:
                # Extract transaction data with safe fallbacks
                name = transaction.get("name", "")
                raw_share = transaction.get("share")
                raw_change = transaction.get("change")
                raw_price = transaction.get("transactionPrice")

                # Coerce None/invalid numeric fields to safe defaults
                try:
                    share = int(raw_share) if raw_share is not None else 0
                except (TypeError, ValueError):
                    share = 0

                try:
                    change = int(raw_change) if raw_change is not None else 0
                except (TypeError, ValueError):
                    change = 0

                try:
                    transaction_price = (
                        float(raw_price) if raw_price is not None else 0.0
                    )
                except (TypeError, ValueError):
                    transaction_price = 0.0

                filing_date = transaction.get("filingDate", "")
                transaction_date = transaction.get("transactionDate", "")
                transaction_code = transaction.get("transactionCode", "")

                # Skip if required fields are missing
                if not name or not transaction_date:
                    print(
                        f"⚠️ Skipping transaction with missing required fields: {transaction}"
                    )
                    continue

                # Check if transaction already exists
                # Use (symbol, name, transactionDate, change) as unique identifier
                existing = await InsiderTransactionDocument.find_one(
                    InsiderTransactionDocument.symbol == symbol_upper,
                    InsiderTransactionDocument.name == name,
                    InsiderTransactionDocument.transactionDate == transaction_date,
                    InsiderTransactionDocument.change == change,
                )

                if existing:
                    # Update existing transaction
                    existing.share = share
                    existing.filingDate = filing_date
                    existing.transactionCode = transaction_code
                    existing.transactionPrice = transaction_price
                    await existing.touch()
                    saved_count += 1
                else:
                    # Create new transaction document
                    doc = InsiderTransactionDocument(
                        symbol=symbol_upper,
                        name=name,
                        share=share,
                        change=change,
                        filingDate=filing_date,
                        transactionDate=transaction_date,
                        transactionCode=transaction_code,
                        transactionPrice=transaction_price,
                    )
                    await doc.insert()
                    saved_count += 1

            except Exception as e:
                print(f"❌ Error saving transaction: {e}")
                print(f"   Transaction data: {transaction}")
                continue

        return saved_count

    async def get_by_symbol(
        self, symbol: str, limit: Optional[int] = None
    ) -> List[InsiderTransactionDocument]:
        """Get insider transactions for a symbol."""
        symbol_upper = symbol.upper().strip()
        query = InsiderTransactionDocument.find(
            InsiderTransactionDocument.symbol == symbol_upper
        ).sort(-InsiderTransactionDocument.transactionDate)

        if limit:
            query = query.limit(limit)

        return await query.to_list()

    async def get_by_symbol_and_date_range(
        self,
        symbol: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[InsiderTransactionDocument]:
        """Get insider transactions for a symbol within a date range."""
        symbol_upper = symbol.upper().strip()
        query = InsiderTransactionDocument.find(
            InsiderTransactionDocument.symbol == symbol_upper
        )

        if from_date:
            query = query.find(
                InsiderTransactionDocument.transactionDate >= from_date
            )
        if to_date:
            query = query.find(InsiderTransactionDocument.transactionDate <= to_date)

        query = query.sort(-InsiderTransactionDocument.transactionDate)

        if limit:
            query = query.limit(limit)

        return await query.to_list()

