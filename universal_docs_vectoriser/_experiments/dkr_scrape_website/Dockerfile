# https://docs.aws.amazon.com/lambda/latest/dg/typescript-image.html
FROM public.ecr.aws/lambda/nodejs:16 as builder
# WORKDIR /usr/app
COPY scrape_website.ts package*.json ./

RUN npm install
RUN npm run build
# If you are building your code for production, instead include a package-lock.json file on this directory and use:
# RUN npm ci --production
# FROM public.ecr.aws/lambda/nodejs:16
# WORKDIR ${LAMBDA_TASK_ROOT}
# COPY --from=builder /usr/app/dist/* ./
# Command can be overwritten by providing a different command in the template directly.
CMD ["scrape_website.handler"]
