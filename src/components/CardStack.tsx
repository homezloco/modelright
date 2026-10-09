import React from 'react';

interface CardStackProps {
  data: Array<Record<string, any>>;
  labels: Record<string, string>;
}

const CardStack: React.FC<CardStackProps> = ({ data, labels }) => {
  return (
    <div className="card-stack">
      {data.map((item, index) => (
        <div key={index} className="card-stack-item">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key} className="card-stack-row">
              <span className="card-stack-label">{label}:</span>
              <span className="card-stack-value">{item[key]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CardStack;