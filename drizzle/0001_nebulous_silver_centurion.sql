CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`collectionId` int,
	`tab` enum('canvas','fonts','colors','code','media','bookmarks') NOT NULL DEFAULT 'canvas',
	`type` enum('link_preview','shadow_dom','plain_text','font_package','media_element','raw_binary','color') NOT NULL,
	`title` varchar(512),
	`primaryPayload` text,
	`fallbackPayload` text,
	`storageKey` varchar(1024),
	`storageUrl` text,
	`canvasX` int DEFAULT 0,
	`canvasY` int DEFAULT 0,
	`canvasZ` int DEFAULT 0,
	`canvasWidth` int DEFAULT 320,
	`canvasHeight` int DEFAULT 220,
	`renderFlags` json,
	`meta` json,
	`syncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `canvas_tabs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`viewportX` int DEFAULT 0,
	`viewportY` int DEFAULT 0,
	`viewportZoom` bigint DEFAULT 100,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `canvas_tabs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`extensionTag` varchar(64),
	`tab` enum('canvas','fonts','colors','code','media','bookmarks') NOT NULL DEFAULT 'canvas',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
