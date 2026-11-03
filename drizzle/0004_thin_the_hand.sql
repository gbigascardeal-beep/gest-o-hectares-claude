CREATE TABLE `purchase_order_installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_order_id` int NOT NULL,
	`installment_number` int NOT NULL,
	`due_date` varchar(10) NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`payment_method` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_installments_id` PRIMARY KEY(`id`)
);
