ALTER TABLE `purchase_order_items` MODIFY COLUMN `product_id` int;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `product_name` varchar(500);