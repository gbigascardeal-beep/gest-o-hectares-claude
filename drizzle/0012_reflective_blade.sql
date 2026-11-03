CREATE TABLE `purchase_request_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`file_url` text NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`uploaded_by` int NOT NULL,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_request_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`user_id` int NOT NULL,
	`message` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_request_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`old_status` varchar(50),
	`new_status` varchar(50) NOT NULL,
	`changed_by` int NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`observation` text,
	CONSTRAINT `purchase_request_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`product_code` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`quantity` int NOT NULL,
	`unit` varchar(20) NOT NULL,
	`desired_brand` varchar(100),
	`suggested_supplier` varchar(100),
	`estimated_value` decimal(12,2) NOT NULL,
	`item_observation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(50) NOT NULL,
	`date` timestamp NOT NULL DEFAULT (now()),
	`requester_id` int NOT NULL,
	`sector` varchar(100) NOT NULL,
	`cost_center_id` int NOT NULL,
	`priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`desired_date` varchar(10),
	`observations` longtext,
	`status` enum('pendente','em_cotacao','aguardando_aprovacao','aprovado','compra_realizada','recebido','cancelado') NOT NULL DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_requests_number_unique` UNIQUE(`number`)
);
