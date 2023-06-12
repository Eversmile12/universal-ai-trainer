import datetime
import json
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import uuid
from data.page import Page
from langchain.text_splitter import RecursiveCharacterTextSplitter


def handler(event, context):
    # object_key = event['items']
    # s3 = boto3.client('s3')
    # job_object = retrieve_json_from_s3(object_key, s3)
    # pages = job_object["items"]
    print(event)
    # pages = json.loads(event["body"])["Items"]
    pages = event["Items"]
    print(pages)
    pages_to_scrape = [page for page in pages if not page['cached']]
    pages_with_embeddings = [page for page in pages if page['cached']]
    results = []
    for page in pages_to_scrape:
        results.append(scrape_page(page))
    # Extend the list separately
    return results+pages_with_embeddings

    # job_object["pages"] =
    # store_json_to_s3(object_key, job_object, s3)
    # return {
    #     "statusCode": 200,
    #     "body": json.dumps({
    #         "message": "success",
    #     })
    # }


def sanitize_text(text):
    # Remove leading/trailing spaces and newlines
    text = text.strip()
    # Remove consecutive whitespaces
    text = re.sub(r'\s+', ' ', text)
    # Add more sanitization rules as needed
    return text


def scrape_page(page):
    link = page['url']
    print(f"Scraping text from {link}")
    response = requests.get(link)
    content = response.content
    try:
        soup = BeautifulSoup(content, "html.parser")
    except:
        print(f"Skipping {link} due to invalid HTML")
        return {'link': link, 'text': None}
    # Find the body of the page
    body = soup.find("body")
    if body is None:
        return {'link': link, 'text': None}

    # Find the header and footer tags, if they exist, and remove them and their contents
    for tag in body(["footer", "nav"]):
        tag.extract()

    chunks = []
    current_chunk = []
    unique_texts = set()
    current_chunk_length = 0
    found_header = False  # Flag to track if the first header has been found

    page_text = ""
    for tag in body.find_all(True, recursive=True):
        text = tag.get_text(strip=True)
        page_text += sanitize_text(text)

    text_splitter = RecursiveCharacterTextSplitter(
        # Set a really small chunk size, just to show.
        chunk_size=1500,
        chunk_overlap=20,
        length_function=len,
        add_start_index=True,
    )
    texts = text_splitter.create_documents([page_text])

    for text in texts:
        if len(text.page_content):
            chunks.append({"M": {"id": {"S": str(uuid.uuid4())},  "metadata": {"M": {"url": {"S": link},
                                                                                     "text": {"S": text.page_content}, "last_time_scraped": {"S": datetime.datetime.now().isoformat()}}}}})
    #     if tag.name in ['h1', 'h2']:
    #         found_header = True  # Set the flag when the first header is found
    #         print("found a header")
    #         if current_chunk_length > 1000:
    #             chunk_text = " ".join(current_chunk)
    #             if chunk_text not in unique_texts:

    #                 unique_texts.add(chunk_text)
    #                 print("Appending to chunks", current_chunk)
    #             current_chunk = []
    #             current_chunk_length = 0
    #     text = tag.get_text(strip=True)
    #     text = sanitize_text(text)
    #     # Only add text after the first header is found
    #     if found_header and len(text) > 0:
    #         current_chunk.append(text)
    #         current_chunk_length += len(text)
    #     if current_chunk_length > 10000:
    #         current_chunk = []
    #         current_chunk_length = 0
    #     elif current_chunk_length > 1000:
    #         chunk_text = " ".join(current_chunk)
    #         if chunk_text not in unique_texts:
    #             chunks.append({"M": {"id": {"S": str(uuid.uuid4())},  "metadata": {"M": {"url": {"S": link},
    #                                                                                      "text": {"S": chunk_text}, "last_time_scraped": {"S": datetime.datetime.now().isoformat()}}}}})
    #             unique_texts.add(chunk_text)
    #         current_chunk = []
    #         current_chunk_length = 0
    # if current_chunk:
    #     chunk_text = " ".join(current_chunk)
    #     if chunk_text not in unique_texts:
    #         chunks.append({"M": {"id": {"S": str(uuid.uuid4())},  "metadata": {"M": {"url": {"S": link},
    #                                                                                  "text": {"S": chunk_text}, "last_time_scraped": {"S": datetime.datetime.now().isoformat()}}}}})
    #         unique_texts.add(chunk_text)

    print(f"Chunks for {link}:")
    for chunk in chunks:
        print(chunk)
    if len(chunks):
        page = Page(link, chunks)
        Page.add_page(page)
        return {'url': link}
    else:
        return

# def store_json_to_s3(object_key: str, payload: dict, s3):
#     try:
#         params = {
#             'Bucket': os.environ['S3_BUCKET'],
#             'Key': object_key,
#             'Body': json.dumps(payload),
#             'ContentType': 'application/json'
#         }

#         s3.put_object(**params)

#         print(
#             f"Successfully stored JSON object in S3: {os.environ['S3_BUCKET']}/{object_key}")
#     except Exception as error:
#         print('Error storing JSON object in S3:', error)
#         raise error


# def retrieve_json_from_s3(object_key: str, s3) -> dict:
#     try:
#         params = {
#             'Bucket': os.environ['S3_BUCKET'],
#             'Key': object_key
#         }

#         response = s3.get_object(**params)
#         body = response['Body'].read().decode('utf-8')
#         data = json.loads(body)

#         pages = data['pages']
#         user_id = data['userId']

#         print('Retrieved JSON object:', pages, user_id)

#         return {'pages': pages, 'userId': user_id}
#     except Exception as error:
#         print('Error retrieving JSON object from S3:', error)
#         raise error

# import boto3
# import requests
# from bs4 import BeautifulSoup
# from urllib.parse import urlparse, urljoin
# from multiprocessing import Pool
# import spacy
# import uuid
# import os

# nlp = spacy.load('/opt/en_core_web_sm-2.1.0')

# dynamodb = boto3.resource('dynamodb')
# table_name = os.environ['PAGES_TABLE']

# pages_table = boto3.resource(
#     'dynamodb',
# )

# table = pages_table.Table(table_name)


# def handler(event, context):

#     with Pool() as pool:
#         pages = event['pages']

#     with Pool() as pool:
#         results = pool.map(scrape_page, pages)
#         for result in results:
#             link = result['link']
#             text = result['text']
#             if text is not None:
#                 print(f"Processing text from {link}")
#                 text = text.replace("\t", " ")
#                 doc = nlp(text)
#                 max_chunk_tokens = 300
#                 chunks = []
#                 chunk = []
#                 num_tokens = 0
#                 for sent in doc.sents:
#                     sent_tokens = len(sent)
#                     if num_tokens + sent_tokens > max_chunk_tokens and len(chunk) > 0:
#                         chunks.append(
#                             {"id": uuid.uuid3(), "url": link, "text": " ".join(chunk), "embeddings": [], })
#                         chunk = []
#                         num_tokens = 0
#                     chunk.append(sent.text)
#                     num_tokens += sent_tokens
#                 if len(chunk) > 0:
#                     chunks.append(
#                         {"id": uuid.uuid3(), "url": link, "text": " ".join(chunk), "embeddings": [], })
#                 table.put_item(
#                     Item={'url': link, "chunks": chunks})
#             else:
#                 print(f"Skipping {link} due to empty text")


# def scrape_page(page):
#     link = page['url']
#     print(f"Scraping text from {link}")
#     response = requests.get(link)
#     content = response.content
#     soup = BeautifulSoup(content, "html.parser")

#     # Find the body of the page
#     body = soup.find("body")
#     if body is None:
#         return {'link': link, 'text': None}

#     # Find the header and footer tags, if they exist, and remove them and their contents
#     for tag in body(["header", "footer", "nav"]):
#         tag.extract()

#     # Extract the remaining text in the body and remove double new lines and random spaces
#     text = body.get_text(separator="\n").replace("\n\n", "\n").strip()
#     text = ' '.join(text.split())

#     return {'link': link, 'text': text}
