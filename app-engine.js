function buildModelCode({ y, x, intercept, robust, confidence }) {
  const formula = `${y} ~ ${intercept ? '' : '0 + '}${x.join(' + ')}`;
  const robustBlock = robust ? `
# HC1 heteroskedasticity-consistent covariance matrix
X <- model.matrix(model)
e <- residuals(model)
n <- nrow(X)
k <- ncol(X)
bread <- solve(crossprod(X))
meat <- crossprod(X, X * as.numeric(e)^2)
vcov_used <- (n / (n - k)) * bread %*% meat %*% bread
standard_errors <- sqrt(diag(vcov_used))` : `
# Classical covariance matrix
vcov_used <- vcov(model)
standard_errors <- sqrt(diag(vcov_used))`;
  return `${buildDataFrameCode()}

# OLS specification
model <- lm(${formula}, data = data, na.action = na.omit)
${robustBlock}

estimates <- coef(model)
t_statistics <- estimates / standard_errors
p_values <- 2 * pt(-abs(t_statistics), df = df.residual(model))
critical_value <- qt(1 - (1 - ${confidence}) / 2, df = df.residual(model))
confidence_low <- estimates - critical_value * standard_errors
confidence_high <- estimates + critical_value * standard_errors

# Diagnostics implemented with base R
model_residuals <- residuals(model)
model_fitted <- fitted(model)
residual_n <- length(model_residuals)
residual_skewness <- mean((model_residuals - mean(model_residuals))^3) / sd(model_residuals)^3
residual_kurtosis <- mean((model_residuals - mean(model_residuals))^4) / sd(model_residuals)^4
jarque_bera <- residual_n / 6 * (residual_skewness^2 + (residual_kurtosis - 3)^2 / 4)
jarque_bera_p <- pchisq(jarque_bera, df = 2, lower.tail = FALSE)

X_no_intercept <- model.matrix(model)[, colnames(model.matrix(model)) != "(Intercept)", drop = FALSE]
if (ncol(X_no_intercept) > 0) {
  bp_aux <- lm(model_residuals^2 ~ X_no_intercept)
  bp_statistic <- length(model_residuals) * summary(bp_aux)$r.squared
  bp_df <- ncol(X_no_intercept)
  bp_p <- pchisq(bp_statistic, df = bp_df, lower.tail = FALSE)
} else {
  bp_statistic <- NA_real_
  bp_p <- NA_real_
}

if (length(model_residuals) > ncol(model.matrix(model)) + 2) {
  bg_y <- model_residuals[-1]
  bg_lag <- model_residuals[-length(model_residuals)]
  bg_X <- model.matrix(model)[-1, , drop = FALSE]
  bg_aux <- lm(bg_y ~ bg_X - 1 + bg_lag)
  bg_statistic <- length(bg_y) * summary(bg_aux)$r.squared
  bg_p <- pchisq(bg_statistic, df = 1, lower.tail = FALSE)
} else {
  bg_statistic <- NA_real_
  bg_p <- NA_real_
}

if (ncol(X_no_intercept) >= 2) {
  vif_values <- sapply(seq_len(ncol(X_no_intercept)), function(j) {
    target <- X_no_intercept[, j]
    others <- X_no_intercept[, -j, drop = FALSE]
    r_squared_j <- summary(lm(target ~ others))$r.squared
    1 / (1 - r_squared_j)
  })
  names(vif_values) <- colnames(X_no_intercept)
} else if (ncol(X_no_intercept) == 1) {
  vif_values <- setNames(1, colnames(X_no_intercept))
} else {
  vif_values <- numeric(0)
}`;
}

async function getArray(expression) {
  const object = await state.webR.evalR(expression);
  try { return await object.toArray(); } finally { state.webR.destroy(object); }
}
async function getNumber(expression) {
  const object = await state.webR.evalR(expression);
  try { return await object.toNumber(); } finally { state.webR.destroy(object); }
}
async function getString(expression) {
  const object = await state.webR.evalR(expression);
  try { return await object.toString(); } finally { state.webR.destroy(object); }
}
