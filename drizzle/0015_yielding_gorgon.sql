CREATE TABLE `exit_request_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`performed_by` int NOT NULL,
	`observation` text,
	`performed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exit_request_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exit_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity_requested` int NOT NULL,
	`quantity_delivered` int NOT NULL DEFAULT 0,
	`item_observation` text,
	`exit_item_status` enum('pendente','retirado','cancelado') NOT NULL DEFAULT 'pendente',
	`delivered_at` timestamp,
	`delivered_by` int,
	CONSTRAINT `exit_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exit_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(50) NOT NULL,
	`date` timestamp NOT NULL DEFAULT (now()),
	`supervisor_id` int NOT NULL,
	`sector` varchar(100) NOT NULL,
	`collaborator_name` varchar(255) NOT NULL,
	`expected_date` varchar(20),
	`observations` text,
	`exit_request_status` enum('aguardando_retirada','parcialmente_retirado','retirado','cancelado') NOT NULL DEFAULT 'aguardando_retirada',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exit_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `exit_requests_number_unique` UNIQUE(`number`)
);
