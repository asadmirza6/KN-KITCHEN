# Phase 4: Multi-Ingredient Recipe Testing Plan

## Test Scenario: Beef Biryani (Complex Multi-Ingredient Dish)

### Prerequisites
1. Create inventory items for all ingredients
2. Create a menu item "Beef Biryani"
3. Create a recipe linking Beef Biryani to multiple ingredients
4. Create an order with Beef Biryani
5. Process the order and verify inventory deduction

### Test Data Setup

#### Step 1: Create Inventory Items
Required ingredients for Beef Biryani:
- Beef (kg): 2 kg @ Rs. 500/kg = Rs. 1000
- Basmati Rice (kg): 1.5 kg @ Rs. 200/kg = Rs. 300
- Onions (kg): 0.5 kg @ Rs. 100/kg = Rs. 50
- Ghee (ltr): 0.25 ltr @ Rs. 800/ltr = Rs. 200
- Spices Mix (kg): 0.1 kg @ Rs. 1000/kg = Rs. 100

**Total Cost per Plate: Rs. 1650**

#### Step 2: Create Menu Item
- Name: Beef Biryani
- Price: Rs. 2500 (40% margin)
- Calculation: 1650 / (1 - 0.40) = 2750 (rounded to 2500)

#### Step 3: Create Recipe
Link Beef Biryani to all 5 ingredients with quantities

#### Step 4: Create Order
- Customer: Test Customer
- Items: 2x Beef Biryani
- Total Revenue: Rs. 5000
- Expected Cost: 2 × Rs. 1650 = Rs. 3300
- Expected Profit: Rs. 5000 - Rs. 3300 = Rs. 1700
- Expected Margin: (1700 / 5000) × 100 = 34%

#### Step 5: Process Order
- Change order status to "Processing"
- Verify inventory deduction for ALL ingredients:
  - Beef: 2 kg deducted
  - Basmati Rice: 3 kg deducted
  - Onions: 1 kg deducted
  - Ghee: 0.5 ltr deducted
  - Spices Mix: 0.2 kg deducted

#### Step 6: Complete Order
- Change order status to "Completed"
- Verify profit calculation:
  - Total Revenue: Rs. 5000
  - Total Cost: Rs. 3300
  - Net Profit: Rs. 1700
  - Profit Margin: 34%

#### Step 7: Verify Dashboard
- Check ProfitSummary widget shows today's profit
- Verify profit breakdown in admin dashboard

### Expected Outcomes

✅ All inventory items created successfully
✅ Recipe created with 5 ingredients
✅ Order created with 2x Beef Biryani
✅ Inventory deducted correctly for all ingredients when order → "Processing"
✅ Profit calculated correctly when order → "Completed"
✅ ProfitSummary widget displays accurate data
✅ Low stock alerts triggered if any ingredient falls below 5 units

### Test Execution Steps

1. Navigate to Admin Dashboard
2. Go to Inventory Management → Add 5 inventory items
3. Go to Items Management → Add Beef Biryani menu item
4. Go to Recipe Builder → Create recipe linking Beef Biryani to all ingredients
5. Go to Orders Management → Create new order with 2x Beef Biryani
6. Change order status to "Processing" → Verify inventory deduction
7. Change order status to "Completed" → Verify profit calculation
8. Return to Admin Dashboard → Check ProfitSummary widget

### API Endpoints to Verify

- POST /inventory - Create inventory items
- POST /items - Create menu item
- POST /recipes - Create recipe with multiple ingredients
- POST /orders - Create order
- PUT /orders/{id}/status - Update order status
- GET /orders/profit/summary - Fetch profit analytics
- GET /recipes/product/{product_id} - Get recipes for product (used during order processing)

### Success Criteria

- ✅ All 5 inventory items created with correct stock and prices
- ✅ Recipe created with all 5 ingredients and correct quantities
- ✅ Order created successfully with 2x Beef Biryani
- ✅ When order status → "Processing": All 5 ingredients deducted correctly
- ✅ When order status → "Completed": Profit calculated as Rs. 1700 with 34% margin
- ✅ ProfitSummary widget shows today's profit including this order
- ✅ No errors in browser console or backend logs
- ✅ Weighted average pricing updated correctly after inventory deduction
