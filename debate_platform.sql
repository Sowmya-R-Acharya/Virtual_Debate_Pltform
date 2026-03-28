-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 04, 2026 at 01:59 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `debate_platform`
--

-- --------------------------------------------------------

--
-- Table structure for table `debates`
--

CREATE TABLE `debates` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `topic` varchar(255) NOT NULL,
  `team_pair` varchar(150) NOT NULL,
  `debate_date` date NOT NULL,
  `duration` int(11) NOT NULL,
  `status` enum('CREATED','SUBMITTED','APPROVED','REJECTED') DEFAULT 'CREATED',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `debates`
--

INSERT INTO `debates` (`id`, `title`, `topic`, `team_pair`, `debate_date`, `duration`, `status`, `created_at`) VALUES
(45, 'ryeeg', 'Should AI be integrated into every classroom?', 'Team Alpha vs Team Beta', '2026-02-04', 5, 'CREATED', '2026-02-04 11:04:01'),
(46, 'fhfh', 'Should governments regulate social media algorithms?', 'Team Gamma vs Team Delta', '2026-02-04', 5, 'CREATED', '2026-02-04 11:04:09'),
(47, 'yrry', 'Should renewable energy replace fossil fuels within a decade?', 'Team Sigma vs Team Omega', '2026-02-04', 5, 'CREATED', '2026-02-04 11:04:23'),
(48, 'thry', 'Should remote work become mandatory where possible?', 'Team Phoenix vs Team Titan', '2026-02-04', 4, 'CREATED', '2026-02-04 11:04:42'),
(49, 'fhfj', 'Should space exploration receive more public funding?', 'Team Orion vs Team Nova', '2026-02-04', 4, 'CREATED', '2026-02-04 11:04:53');

-- --------------------------------------------------------

--
-- Table structure for table `results`
--

CREATE TABLE `results` (
  `id` int(11) NOT NULL,
  `debate_id` int(11) NOT NULL,
  `winning_team` varchar(100) DEFAULT NULL,
  `average_rating` decimal(3,2) DEFAULT NULL,
  `published_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `live_debate_messages`
--

CREATE TABLE `live_debate_messages` (
  `id` int(11) NOT NULL,
  `debate_id` int(11) NOT NULL,
  `room_id` varchar(120) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `team_name` varchar(100) DEFAULT NULL,
  `audio_data` mediumtext NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `duration_seconds` decimal(8,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `id` int(11) NOT NULL,
  `debate_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `performed_minutes` int(11) DEFAULT NULL,
  `voice_audio` mediumtext DEFAULT NULL,
  `voice_transcript` mediumtext DEFAULT NULL,
  `voice_message` text DEFAULT NULL,
  `status` enum('SUBMITTED','APPROVED','REJECTED') DEFAULT 'SUBMITTED',
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `teams` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('ADMIN','DEBATER','AUDIENCE') NOT NULL,
  `team_name` varchar(100) DEFAULT NULL,
  `slot` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `votes`
--

CREATE TABLE `votes` (
  `id` int(11) NOT NULL,
  `debate_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `team_voted` varchar(100) NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `voted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `debates`
--
ALTER TABLE `debates`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `results`
--
ALTER TABLE `results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debate_id` (`debate_id`);

--
-- Indexes for table `live_debate_messages`
--
ALTER TABLE `live_debate_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_live_debate_messages_debate_id` (`debate_id`),
  ADD KEY `idx_live_debate_messages_room_id` (`room_id`),
  ADD KEY `idx_live_debate_messages_user_id` (`user_id`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debate_id` (`debate_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debate_id` (`debate_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `debates`
--
ALTER TABLE `debates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `results`
--
ALTER TABLE `results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `live_debate_messages`
--
ALTER TABLE `live_debate_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teams`
--
ALTER TABLE `teams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `votes`
--
ALTER TABLE `votes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `results`
--
ALTER TABLE `results`
  ADD CONSTRAINT `results_ibfk_1` FOREIGN KEY (`debate_id`) REFERENCES `debates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `live_debate_messages`
--
ALTER TABLE `live_debate_messages`
  ADD CONSTRAINT `fk_live_debate_messages_debate` FOREIGN KEY (`debate_id`) REFERENCES `debates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_live_debate_messages_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`debate_id`) REFERENCES `debates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `votes`
--
ALTER TABLE `votes`
  ADD CONSTRAINT `votes_ibfk_1` FOREIGN KEY (`debate_id`) REFERENCES `debates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `votes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
