ALTER TABLE posts ADD FULLTEXT INDEX ft_posts_search (title, content) WITH PARSER ngram;
