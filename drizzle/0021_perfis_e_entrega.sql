ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','supervisor','comprador','almoxarifado') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `purchase_orders` MODIFY COLUMN `status` enum('pendente','aprovada','finalizada','cancelada','solicitado','entregue') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
UPDATE `purchase_orders` SET `status` = 'solicitado' WHERE `status` IN ('pendente','aprovada');--> statement-breakpoint
UPDATE `purchase_orders` SET `status` = 'entregue' WHERE `status` = 'finalizada';--> statement-breakpoint
ALTER TABLE `purchase_orders` MODIFY COLUMN `status` enum('solicitado','entregue','cancelada') NOT NULL DEFAULT 'solicitado';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `stock_applied_at` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `is_specific_use` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `stock_movement_id` int;
