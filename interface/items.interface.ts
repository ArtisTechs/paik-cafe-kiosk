export interface ItemType {
  id: string;
  name: string;
  description: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  itemType: ItemType;
  variation: string[];
  price: number[];
  photo: string;
  inStock: boolean;
}

export interface CartItem {
  item: MenuItem;
  variation: string;
  quantity: number;
}
