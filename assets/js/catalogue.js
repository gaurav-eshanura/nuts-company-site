/* The Nuts Company - product catalogue.
   Authoritative source for the bag, the search drawer and the size steppers.
   The static tile grid on nuts.html carries the same values in data-* attributes
   so search engines see them without running JavaScript; build/check_site.py
   fails the build if the two ever drift apart.

   Prices are placeholders pending the final rate card from Eshanura. */
window.TNC_CATALOGUE = [
  { "id": "almonds-20",  "kind": "almonds", "name": "Almonds", "size": "20 g",  "note": "On-the-go",    "price": 40,  "img": "assets/img/products/almonds-20.webp" },
  { "id": "almonds-50",  "kind": "almonds", "name": "Almonds", "size": "50 g",  "note": "Everyday",     "price": 95,  "img": "assets/img/products/almonds-50.webp" },
  { "id": "almonds-100", "kind": "almonds", "name": "Almonds", "size": "100 g", "note": "Better value", "price": 180, "img": "assets/img/products/almonds-100.webp" },
  { "id": "almonds-200", "kind": "almonds", "name": "Almonds", "size": "200 g", "note": "Family pack",  "price": 340, "img": "assets/img/products/almonds-200.webp" },
  { "id": "cashews-20",  "kind": "cashews", "name": "Cashews", "size": "20 g",  "note": "On-the-go",    "price": 75,  "img": "assets/img/products/cashews-20.webp" },
  { "id": "cashews-50",  "kind": "cashews", "name": "Cashews", "size": "50 g",  "note": "Everyday",     "price": 180, "img": "assets/img/products/cashews-50.webp" },
  { "id": "cashews-100", "kind": "cashews", "name": "Cashews", "size": "100 g", "note": "Better value", "price": 340, "img": "assets/img/products/cashews-100.webp" },
  { "id": "cashews-200", "kind": "cashews", "name": "Cashews", "size": "200 g", "note": "Family pack",  "price": 650, "img": "assets/img/products/cashews-200.webp" },
  { "id": "raisins-20",  "kind": "raisins", "name": "Raisins", "size": "20 g",  "note": "On-the-go",    "price": 25,  "img": "assets/img/products/raisins-20.webp" },
  { "id": "raisins-50",  "kind": "raisins", "name": "Raisins", "size": "50 g",  "note": "Everyday",     "price": 60,  "img": "assets/img/products/raisins-50.webp" },
  { "id": "raisins-100", "kind": "raisins", "name": "Raisins", "size": "100 g", "note": "Better value", "price": 115, "img": "assets/img/products/raisins-100.webp" },
  { "id": "raisins-200", "kind": "raisins", "name": "Raisins", "size": "200 g", "note": "Family pack",  "price": 220, "img": "assets/img/products/raisins-200.webp" }
];
