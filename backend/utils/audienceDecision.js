const POSITIVE_WORDS = new Set([
  "amazing",
  "awesome",
  "balanced",
  "best",
  "clear",
  "compelling",
  "confident",
  "convincing",
  "credible",
  "effective",
  "engaging",
  "excellent",
  "fair",
  "good",
  "great",
  "impressive",
  "insightful",
  "logical",
  "outstanding",
  "persuasive",
  "positive",
  "powerful",
  "smart",
  "solid",
  "strong",
  "superb",
  "supportive",
  "well",
  "winner"
]);

const NEGATIVE_WORDS = new Set([
  "awkward",
  "bad",
  "biased",
  "boring",
  "confusing",
  "disappointing",
  "flawed",
  "incoherent",
  "inconsistent",
  "inconvincing",
  "negative",
  "poor",
  "rambling",
  "rough",
  "weak",
  "worse",
  "worst",
  "unclear",
  "unconvincing",
  "unfair"
]);

function analyzeCommentSentiment(comment) {
  const normalized = String(comment || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ");
  const words = normalized.split(/\s+/).filter(Boolean);

  let positiveHits = 0;
  let negativeHits = 0;

  words.forEach((word) => {
    if (POSITIVE_WORDS.has(word)) {
      positiveHits += 1;
    }
    if (NEGATIVE_WORDS.has(word)) {
      negativeHits += 1;
    }
  });

  return {
    positiveHits,
    negativeHits,
    sentimentScore: positiveHits - negativeHits
  };
}

function evaluateAudienceDecision(votes) {
  const teamSummaries = new Map();

  votes.forEach((vote) => {
    const teamName = String(vote.team_voted || "").trim();
    if (!teamName) {
      return;
    }

    const numericRating = Number(vote.rating) || 0;
    const sentiment = analyzeCommentSentiment(vote.comment);

    if (!teamSummaries.has(teamName)) {
      teamSummaries.set(teamName, {
        team: teamName,
        voteCount: 0,
        totalRating: 0,
        averageRating: 0,
        positiveComments: 0,
        negativeComments: 0,
        sentimentScore: 0,
        audienceScore: 0
      });
    }

    const summary = teamSummaries.get(teamName);
    summary.voteCount += 1;
    summary.totalRating += numericRating;
    summary.positiveComments += sentiment.positiveHits > sentiment.negativeHits ? 1 : 0;
    summary.negativeComments += sentiment.negativeHits > sentiment.positiveHits ? 1 : 0;
    summary.sentimentScore += sentiment.sentimentScore;
  });

  const summaries = Array.from(teamSummaries.values()).map((summary) => {
    const averageRating = summary.voteCount > 0
      ? summary.totalRating / summary.voteCount
      : 0;
    const audienceScore = (averageRating * 2) + summary.sentimentScore;

    return {
      ...summary,
      averageRating: Number(averageRating.toFixed(2)),
      audienceScore: Number(audienceScore.toFixed(2))
    };
  }).sort((left, right) => {
    if (right.audienceScore !== left.audienceScore) {
      return right.audienceScore - left.audienceScore;
    }
    if (right.averageRating !== left.averageRating) {
      return right.averageRating - left.averageRating;
    }
    if (right.positiveComments !== left.positiveComments) {
      return right.positiveComments - left.positiveComments;
    }
    return left.team.localeCompare(right.team);
  });

  const winner = summaries[0] || null;
  const overallAverageRating = summaries.length
    ? Number(
      (
        summaries.reduce((total, summary) => total + summary.totalRating, 0) /
        summaries.reduce((total, summary) => total + summary.voteCount, 0)
      ).toFixed(2)
    )
    : 0;

  return {
    winner,
    summaries,
    overallAverageRating
  };
}

module.exports = {
  evaluateAudienceDecision
};
