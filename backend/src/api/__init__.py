"""API routes package"""

from . import auth
from . import items
from . import media
from . import albums
from . import orders
from . import quotations
from . import packages
from . import users
from . import inventory
from . import vendors
from . import purchase_records
from . import recipes
from . import staff
from . import staff_transactions

__all__ = [
    "auth",
    "items",
    "media",
    "albums",
    "orders",
    "quotations",
    "packages",
    "users",
    "inventory",
    "vendors",
    "purchase_records",
    "recipes",
    "staff",
    "staff_transactions",
]

