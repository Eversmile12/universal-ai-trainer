"""Wrapper around Anyscale"""
from typing import Any, Dict, List, Mapping, Optional

import requests
from pydantic import Extra, root_validator

from langchain.callbacks.manager import CallbackManagerForLLMRun
from langchain.llms.base import LLM
from langchain.llms.utils import enforce_stop_tokens
from langchain.utils import get_from_dict_or_env


class Anyscale(LLM):
    """Wrapper around Anyscale Services.
    To use, you should have the environment variable ``ANYSCALE_SERVICE_URL``,
    ``ANYSCALE_SERVICE_ROUTE`` and ``ANYSCALE_SERVICE_TOKEN`` set with your Anyscale
    Service, or pass it as a named parameter to the constructor.

    Example:
        .. code-block:: python

            from langchain.llms import Anyscale
            anyscale = Anyscale(anyscale_service_url="SERVICE_URL",
                                anyscale_service_route="SERVICE_ROUTE",
                                anyscale_service_token="SERVICE_TOKEN")

            # Use Ray for distributed processing
            import ray
            prompt_list=[]
            @ray.remote
            def send_query(llm, prompt):
                resp = llm(prompt)
                return resp
            futures = [send_query.remote(anyscale, prompt) for prompt in prompt_list]
            results = ray.get(futures)
    """

    model_kwargs: Optional[dict] = None
    """Key word arguments to pass to the model. Reserved for future use"""

    anyscale_service_url: Optional[str] = None
    anyscale_service_route: Optional[str] = None
    anyscale_service_token: Optional[str] = None

    class Config:
        """Configuration for this pydantic object."""

        extra = Extra.forbid

    @root_validator()
    def validate_environment(cls, values: Dict) -> Dict:
        """Validate that api key and python package exists in environment."""
        anyscale_service_url = get_from_dict_or_env(
            values, "anyscale_service_url", "ANYSCALE_SERVICE_URL"
        )
        anyscale_service_route = get_from_dict_or_env(
            values, "anyscale_service_route", "ANYSCALE_SERVICE_ROUTE"
        )
        anyscale_service_token = get_from_dict_or_env(
            values, "anyscale_service_token", "ANYSCALE_SERVICE_TOKEN"
        )
        try:
            anyscale_service_endpoint = f"{anyscale_service_url}/-/route"
            headers = {"Authorization": f"Bearer {anyscale_service_token}"}
            requests.get(anyscale_service_endpoint, headers=headers)
        except requests.exceptions.RequestException as e:
            raise ValueError(e)
        values["anyscale_service_url"] = anyscale_service_url
        values["anyscale_service_route"] = anyscale_service_route
        values["anyscale_service_token"] = anyscale_service_token
        return values

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        return {
            "anyscale_service_url": self.anyscale_service_url,
            "anyscale_service_route": self.anyscale_service_route,
        }

    @property
    def _llm_type(self) -> str:
        """Return type of llm."""
        return "anyscale"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
    ) -> str:
        """Call out to Anyscale Service endpoint.
        Args:
            prompt: The prompt to pass into the model.
            stop: Optional list of stop words to use when generating.
        Returns:
            The string generated by the model.
        Example:
            .. code-block:: python
                response = anyscale("Tell me a joke.")
        """

        anyscale_service_endpoint = (
            f"{self.anyscale_service_url}/{self.anyscale_service_route}"
        )
        headers = {"Authorization": f"Bearer {self.anyscale_service_token}"}
        body = {"prompt": prompt}
        resp = requests.post(anyscale_service_endpoint, headers=headers, json=body)

        if resp.status_code != 200:
            raise ValueError(
                f"Error returned by service, status code {resp.status_code}"
            )
        text = resp.text

        if stop is not None:
            # This is a bit hacky, but I can't figure out a better way to enforce
            # stop tokens when making calls to huggingface_hub.
            text = enforce_stop_tokens(text, stop)
        return text
