CREATE TABLE `asset_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`parent_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_disposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`disposal_type` enum('descarte','venda','doacao','furto','extravio','inutilizacao','transferencia_definitiva','outro') NOT NULL,
	`reason` text NOT NULL,
	`disposal_date` varchar(10) NOT NULL,
	`disposal_value` decimal(12,2),
	`authorized_by` int,
	`executed_by` int,
	`document_url` varchar(1000),
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_disposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`document_type` enum('nota_fiscal','garantia','manual','termo_responsabilidade','orcamento','laudo','comprovante','documento_baixa','foto','outro') NOT NULL,
	`name` varchar(255) NOT NULL,
	`file_url` varchar(1000) NOT NULL,
	`document_date` varchar(10),
	`user_id` int,
	`observation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`user_id` int NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`description` text,
	`previous_data` text,
	`new_data` text,
	`event_date` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_inventories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`start_date` varchar(10) NOT NULL,
	`expected_end_date` varchar(10),
	`completion_date` varchar(10),
	`responsible_id` int,
	`inventory_status` enum('planejado','em_andamento','concluido','cancelado') NOT NULL DEFAULT 'planejado',
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_inventories_id` PRIMARY KEY(`id`),
	CONSTRAINT `asset_inventories_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `asset_inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventory_id` int NOT NULL,
	`asset_id` int NOT NULL,
	`check_status` enum('pendente','encontrado','nao_encontrado','local_diferente','danificado','sem_identificacao','divergente') NOT NULL DEFAULT 'pendente',
	`expected_location_id` int,
	`found_location_id` int,
	`found_state` varchar(50),
	`observation` text,
	`photo_url` varchar(1000),
	`checked_by` int,
	`checked_at` timestamp,
	CONSTRAINT `asset_inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`parent_id` int,
	`type` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_maintenances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`maintenance_type` enum('preventiva','corretiva','inspecao','calibracao','limpeza_tecnica','outro') NOT NULL,
	`maintenance_status` enum('aberta','aguardando_orcamento','aguardando_aprovacao','em_execucao','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`open_date` varchar(10) NOT NULL,
	`send_date` varchar(10),
	`return_date` varchar(10),
	`provider` varchar(255),
	`technician` varchar(255),
	`problem` text,
	`diagnosis` text,
	`service_performed` text,
	`replaced_parts` text,
	`labor_cost` decimal(12,2),
	`parts_cost` decimal(12,2),
	`total_cost` decimal(12,2),
	`service_warranty` varchar(100),
	`next_maintenance` varchar(10),
	`observations` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_maintenances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`origin_location_id` int,
	`destination_location_id` int,
	`previous_responsible_id` int,
	`new_responsible_id` int,
	`type` enum('transferencia_local','transferencia_responsavel','emprestimo','retorno_emprestimo','envio_manutencao','retorno_manutencao','transferencia_setor','transferencia_temporaria','outra') NOT NULL,
	`reason` text,
	`movement_date` varchar(10) NOT NULL,
	`user_id` int NOT NULL,
	`observations` text,
	`document_url` varchar(1000),
	`photo_url` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_responsibilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`responsible_id` int NOT NULL,
	`sector_id` int,
	`start_date` varchar(10) NOT NULL,
	`end_date` varchar(10),
	`term_url` varchar(1000),
	`observation` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_responsibilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` varchar(500) NOT NULL,
	`category_id` int,
	`subcategory_id` int,
	`brand` varchar(255),
	`model` varchar(255),
	`serial_number` varchar(255),
	`manufacturer_id` varchar(255),
	`barcode` varchar(255),
	`status` enum('ativo','em_uso','em_estoque','em_manutencao','em_transferencia','extraviado','em_inventario','baixado') NOT NULL DEFAULT 'ativo',
	`conservation_state` enum('novo','excelente','bom','regular','ruim','inservivel') NOT NULL DEFAULT 'bom',
	`location_id` int,
	`responsible_id` int,
	`sector_id` int,
	`acquisition_date` varchar(10),
	`entry_date` varchar(10),
	`acquisition_value` decimal(12,2),
	`current_value` decimal(12,2),
	`supplier_id` int,
	`invoice_number` varchar(100),
	`invoice_series` varchar(20),
	`order_number` varchar(100),
	`acquisition_type` enum('compra','doacao','transferencia','incorporacao','outro') DEFAULT 'compra',
	`warranty_months` int,
	`warranty_start` varchar(10),
	`warranty_end` varchar(10),
	`last_evaluation_date` varchar(10),
	`next_evaluation_date` varchar(10),
	`photo_url` varchar(1000),
	`observations` text,
	`qr_code` varchar(500),
	`created_by` int,
	`updated_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `assets_code_unique` UNIQUE(`code`)
);
