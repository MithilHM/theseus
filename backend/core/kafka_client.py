import json
from confluent_kafka import Producer, Consumer, KafkaException
from core.config import settings
import logging

logger = logging.getLogger(__name__)

KAFKA_BROKER_URL = "localhost:29092"  # Adjust if using docker networking inside containers

def get_kafka_producer() -> Producer:
    conf = {
        'bootstrap.servers': KAFKA_BROKER_URL,
        'client.id': 'theseus-producer'
    }
    return Producer(conf)

def get_kafka_consumer(group_id: str = "theseus-ingestion-group") -> Consumer:
    conf = {
        'bootstrap.servers': KAFKA_BROKER_URL,
        'group.id': group_id,
        'auto.offset.reset': 'earliest'
    }
    return Consumer(conf)

def publish_job(topic: str, job_id: str, payload: dict):
    producer = get_kafka_producer()
    
    def delivery_report(err, msg):
        if err is not None:
            logger.error(f"Message delivery failed: {err}")
        else:
            logger.info(f"Message delivered to {msg.topic()} [{msg.partition()}]")
            
    producer.produce(
        topic, 
        key=job_id.encode('utf-8'), 
        value=json.dumps(payload).encode('utf-8'), 
        callback=delivery_report
    )
    producer.flush()
