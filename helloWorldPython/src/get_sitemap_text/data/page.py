from typing import List, Optional, Dict, Union
from datetime import datetime
import boto3
from os import environ
from botocore.exceptions import ClientError

# ADD LAST TIME SCRAPED CHECK


class Page:
    def __init__(self, url: str, chunks):
        self.url = url
        self.chunks = chunks
        self.last_time_scraped = None  # New property
        self.cached = False
        self.client = boto3.client('dynamodb')

    @property
    def pk(self) -> str:
        return f"PAGE#{self.url}"

    @property
    def sk(self) -> str:
        return f"PAGE#{self.url}"

    def keys(self) -> dict:
        return {
            'PK': {"S": self.pk},
            'SK': {"S": self.sk},
        }

    def to_item(self):
        item = {
            **self.keys(),
            "url": {"S": self.url},
            "chunks": {"L": self.chunks},
        }
        if self.last_time_scraped:
            # Add last_time_scraped if it is set
            item["last_time_scraped"] = {
                "S": self.last_time_scraped.isoformat()}
        return item

    @classmethod
    def add_page(cls, page: 'Page'):
        client = boto3.client('dynamodb')
        # Set last_time_scraped property before creating the page
        page.last_time_scraped = datetime.now()
        print(page.to_item())
        try:
            client.put_item(
                TableName=environ.get('TABLE_NAME'),
                Item=page.to_item(),
            )
            print("Page added successfully.")
        except ClientError as e:
            print(e.response['Error']['Message'])
        except Exception as error:
            print(error)
            raise Exception('Error creating page')

    @classmethod
    def get_page(cls, url: str) -> Optional['Page']:
        client = boto3.client('dynamodb')

        try:
            page = Page(url)

            response = client.get_item(
                TableName=environ.get('TABLE_NAME'),
                Key=page.keys(),
            )
            if 'Item' in response:
                return Page.from_item(response['Item'])
            else:
                return None
        except ClientError as e:
            print(e.response['Error']['Message'])
            return None
