ALTER TABLE `suppliers` ADD `trade_name` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `category` varchar(100);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `website` varchar(500);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `is_favorite` boolean DEFAULT false NOT NULL;
