CREATE TABLE `asset_tool_loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`collaborator_name` varchar(255) NOT NULL,
	`collaborator_sector` varchar(150),
	`tool_loan_status` enum('pendente','devolvido') NOT NULL DEFAULT 'pendente',
	`withdrawn_at` timestamp NOT NULL DEFAULT (now()),
	`expected_return_date` varchar(10) NOT NULL,
	`returned_at` timestamp,
	`withdrawal_notes` text,
	`return_notes` text,
	`condition_at_withdrawal` varchar(50),
	`condition_at_return` varchar(50),
	`withdrawn_by` int NOT NULL,
	`returned_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_tool_loans_id` PRIMARY KEY(`id`)
);
