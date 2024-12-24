package main

import (
	"flag"
	"log"
	"net/http"

	devcal "github.com/devcaldev/devcal-go"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

var (
	addr   = flag.String("addr", "devcal.fly.dev:50051", "grpc server address")
	apiKey = flag.String("apiKey", "", "api key")
)

func main() {
	flag.Parse()

	dc, err := devcal.New(*addr, *apiKey)
	if err != nil {
		log.Fatal(err)
	}
	defer dc.Close()

	app := fiber.New()
	app.Use(filesystem.New(filesystem.Config{
		Root:  http.Dir("./swagger"),
		Index: "index.html",
	}))

	app.Post("/insertEvent", func(c *fiber.Ctx) error {
		var p devcal.InsertEventParams
		if err := c.BodyParser(&p); err != nil {
			return err
		}
		r, err := dc.InsertEvent(c.Context(), &p)
		if err != nil {
			return err
		}
		return c.JSON(r)
	})

	app.Post("/listEvents", func(c *fiber.Ctx) error {
		var p devcal.ListEventsParams
		if err := c.BodyParser(&p); err != nil {
			return err
		}
		r, err := dc.ListEvents(c.Context(), &p)
		if err != nil {
			return err
		}
		return c.JSON(r)
	})

	app.Post("/getEvent", func(c *fiber.Ctx) error {
		var p devcal.GetEventParams
		if err := c.BodyParser(&p); err != nil {
			return err
		}
		r, err := dc.GetEvent(c.Context(), &p)
		if err != nil {
			return err
		}
		return c.JSON(r)
	})

	app.Post("/updateEvent", func(c *fiber.Ctx) error {
		var p devcal.UpdateEventParams
		if err := c.BodyParser(&p); err != nil {
			return err
		}
		err := dc.UpdateEvent(c.Context(), &p)
		if err != nil {
			return err
		}
		return c.SendStatus(200)
	})

	app.Post("/deleteEvent", func(c *fiber.Ctx) error {
		var p devcal.DeleteEventParams
		if err := c.BodyParser(&p); err != nil {
			return err
		}
		err := dc.DeleteEvent(c.Context(), &p)
		if err != nil {
			return err
		}
		return c.SendStatus(200)
	})

	app.Listen(":9090")
}
