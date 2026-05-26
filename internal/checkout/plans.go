package checkout

import "time"

const TrialPlanID = "trial"

type Plan struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Period            string `json:"period"`
	Months            int    `json:"months"`
	PriceRUB          int    `json:"priceRub"`
	OldPriceRUB       int    `json:"oldPriceRub,omitempty"`
	TrafficLimitGB    int    `json:"trafficLimitGb"`
	Devices           int    `json:"devices"`
	Popular           bool   `json:"popular"`
	Highlight         string `json:"highlight"`
	ProvisionDuration string `json:"provisionDuration"`
}

var Plans = []Plan{
	{
		ID:                TrialPlanID,
		Name:              "Пробный период",
		Period:            "30 дней",
		Months:            0,
		PriceRUB:          0,
		TrafficLimitGB:    100,
		Devices:           2,
		Highlight:         "30 дней для проверки скорости",
		ProvisionDuration: (30 * 24 * time.Hour).String(),
	},
	{
		ID:                "month",
		Name:              "Доступ на месяц",
		Period:            "30 дней",
		Months:            1,
		PriceRUB:          299,
		TrafficLimitGB:    0,
		Devices:           5,
		Highlight:         "Гибкий старт",
		ProvisionDuration: (30 * 24 * time.Hour).String(),
	},
	{
		ID:                "halfyear",
		Name:              "6 месяцев",
		Period:            "180 дней",
		Months:            6,
		PriceRUB:          1490,
		OldPriceRUB:       1794,
		TrafficLimitGB:    0,
		Devices:           7,
		Highlight:         "Выгодный период без лишних настроек",
		ProvisionDuration: (180 * 24 * time.Hour).String(),
	},
	{
		ID:                "year",
		Name:              "12 месяцев",
		Period:            "365 дней",
		Months:            12,
		PriceRUB:          2790,
		OldPriceRUB:       3588,
		TrafficLimitGB:    0,
		Devices:           10,
		Highlight:         "Самая спокойная цена",
		ProvisionDuration: (365 * 24 * time.Hour).String(),
	},
}

func FindPlan(id string) (Plan, bool) {
	for _, plan := range Plans {
		if plan.ID == id {
			return plan, true
		}
	}
	return Plan{}, false
}

func (p Plan) Duration() time.Duration {
	duration, err := time.ParseDuration(p.ProvisionDuration)
	if err != nil {
		return 30 * 24 * time.Hour
	}
	return duration
}

func (p Plan) TrafficLimitBytes() int64 {
	if p.TrafficLimitGB <= 0 {
		return 0
	}
	return int64(p.TrafficLimitGB) * 1024 * 1024 * 1024
}
