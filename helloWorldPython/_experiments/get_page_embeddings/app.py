import json
import uuid
import requests
from urllib.parse import urlparse, urljoin
from lib.pinecone_client import PineconeClient
import multiprocessing as mp
import openai
import os

# import requests
openai.api_key = os.environ['OPEN_AI']
openai.api_base = "https://api.openai.com/v1/"


def lambda_handler(event, context):
    pages = json.loads(event['body'])['pages']
    pool = mp.Pool(processes=mp.cpu_count())
    pages_with_chunks_embeddings = pool.map(get_text_embeddings, pages)
    pool.close()
    pool.join()
    ids_vectors = []
    # training_data = [
    #     json_data for json_list in training_data for json_data in json_list]
    for page in pages_with_chunks_embeddings:
        print(page)
        for chunk in page["chunks"]:
            id = str(uuid.uuid4())
            ids_vectors.append({"id": id, "values": chunk["embeddings"],
                                "metadata": {"message": chunk["text"], "url": page["url"]}})

    client = PineconeClient()
    client.create_index("my-index")
    response = client.upsert("my-index", ids_vectors)
    print(response)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "pages": ""
        }),
    }


def get_text_embeddings(page):
    tempPage = page
    for chunk in tempPage["chunks"]:
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {os.environ['OPEN_AI']}",
            "Content-Type": "application/json"
        }
        payload = {
            "input": chunk["text"],
            "model": "text-embedding-ada-002"
        }
        response = requests.post(url, headers=headers,
                                 data=json.dumps(payload))
        if response.status_code != 200:
            raise ValueError(
                f"Failed to get embeddings for text: {response.text}")
        embeddings = response.json()["data"][0]["embedding"]
        chunk["embeddings"] = embeddings
    return page
